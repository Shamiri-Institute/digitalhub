/**
 * Transcribe a session recording with Gemini Flash, in memory-only chunks.
 * Port of scratch/transribe.ts (itself a port of scripts/transcribe_gemini_flash.py) for the app:
 * audio comes from a URL or a buffer, the transcript is returned, and nothing is written to disk.
 *
 * The recording is decoded once, cut into chunks at silences, and every chunk is uploaded from
 * memory through the Files API, transcribed and deleted. Every segment carries a role (facilitator
 * or student). A chunk that hits the output-token cap (MAX_TOKENS) or keeps coming back blocked is
 * split at the longest silence in its middle third and the parts are transcribed separately, down
 * to 150 s. Chunks run one after another.
 *
 * ffmpeg comes from the ffmpeg-static package (its install script downloads the binary), so
 * nothing needs to be on PATH; ffprobe is not used.
 */
/* oxlint-disable eslint/no-await-in-loop -- retries, file polling and chunks run one at a time by design */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

import {
  ApiError,
  GoogleGenAI,
  ThinkingLevel,
  createPartFromUri,
  type File as GenaiFile,
} from "@google/genai";
import ffmpegStatic from "ffmpeg-static";
import { z } from "zod";

import type { TranscriptSegment } from "#/lib/transcription/segment";

export const DEFAULT_MODEL = "gemini-3.8-flash";
const MODEL_MAX_OUTPUT_TOKENS = 65536; // documented output limit of gemini-3.8-flash
const DEFAULT_MAX_OUTPUT_TOKENS = 24576; // normal 10-minute chunks use 2,000-10,500; a runaway reaches 65,536
const DEFAULT_CHUNK_MINUTES = 10;
const MIN_PART_S = 150; // a part this short or shorter is never split again
const BLOCK_RETRIES = 3; // retries of a blocked or empty response before the chunk is split
const BLOCK_BACKOFF_S = 3; // seconds, times the retry number
const BLOCKED_FINISH = new Set(["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"]);
const MIN_CHUNK_MINUTES = 3; // shorter chunks could make the next silence window start before the previous cut
const MAX_CHUNK_MINUTES = 30;

const UPLOAD_PREFIX = "t1-transcribe-";
const ACTIVE_TIMEOUT_S = 300;
const POLL_SLEEP_S = 8; // seconds between file-state polls
const RETRY_CODES = new Set([429, 500, 502, 503, 504]);
const REQUEST_TIMEOUT_S = 600;
const READ_TIMEOUT_US = 30_000_000; // ffmpeg gives up on a URL that sends nothing for 30 s

// audio
const SR = 16000;
const MIN_SILENCE_S = 0.3; // shortest pause that counts as a cut candidate
const LOOK_BEFORE_S = 60;
const LOOK_AFTER_S = 120;
const MIN_TAIL_S = 120; // a shorter final piece is merged into the previous chunk
const LADDER_DB = [40, 35, 30, 25, 20, 15]; // silence thresholds: this many dB below the file's speech level
const MIN_RANGE_DB = 6.0; // a flatter file (speech level - quietest frames) has no silence at all
const DECODE_MIN_RATIO = 0.995;

const PROMPTS = {
  detailed: `\
This is a recorded group session in a Kenyan secondary school, led by a young \
adult facilitator with students. The languages are English, Swahili and Sheng, \
with frequent code-switching between them.

Transcribe the recording exactly as spoken. Do not translate, do not correct \
grammar and do not summarise.

Every segment has a role. The facilitator is the person who opens the session, \
gives instructions and leads the discussion; everyone else is a student, with \
no distinction between different students. Start a new segment whenever the \
speaker changes, so the facilitator and the students never share a segment. \
Never identify anyone by voice and never guess names.

Mark unintelligible speech as [inaudible] and overlapping speech as \
[crosstalk].

Return the list of segments in order. Give the start and end time of each \
segment as MM:SS (H:MM:SS above one hour).
`,
  simple:
    "Transcribe this audio exactly as spoken. The audio may contain English, " +
    "Swahili, or a mix of both (code-switching). Label each segment with the " +
    "role of the speaker: facilitator (the person leading the session) or " +
    "student (everyone else). Start a new segment whenever the speaker changes. " +
    "Give the start and end time of each segment as MM:SS (H:MM:SS above one hour).",
};
type PromptName = keyof typeof PROMPTS;

// ------------------------------------------------- API response schema (strings)

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string", enum: ["facilitator", "student"] },
          start: { type: "string" }, // MM:SS or H:MM:SS
          end: { type: "string" },
          text: { type: "string" },
        },
        required: ["role", "start", "end", "text"],
      },
    },
  },
  required: ["segments"],
};

const Role = z.enum(["facilitator", "student"]);
const ApiResponse = z.object({
  segments: z.array(
    z.object({
      role: Role,
      start: z.string(),
      end: z.string(),
      text: z.string(),
    }),
  ),
});

// ------------------------------------------------- stored segments (float seconds)

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** MM:SS, H:MM:SS or plain seconds (an "s" suffix is accepted) -> seconds, 3 decimals. */
function parseTime(value: string | number): number {
  let text = String(value).trim();
  if (text.endsWith("s")) text = text.slice(0, -1);
  const parts = text.split(":");
  const bad = () => new Error(`bad timestamp ${JSON.stringify(value)}`);
  if (parts.length > 3 || parts.some((p) => !/^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/.test(p))) throw bad();
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + Number(p);
  if (!Number.isFinite(seconds) || seconds < 0 || parts.some((p) => p.trim().startsWith("-")))
    throw bad();
  return round3(seconds);
}

const Time = z.union([z.string(), z.number()]).transform((v, ctx) => {
  try {
    return parseTime(v);
  } catch (e) {
    ctx.addIssue({ code: "custom", message: (e as Error).message });
    return z.NEVER;
  }
});

const Segment = z
  .strictObject({
    chunk: z.number().int(),
    role: Role,
    start: Time,
    end: Time,
    text: z.string().regex(/\S/),
  })
  .refine((s) => s.start <= s.end, { message: "segment start is after end" });
type Segment = z.output<typeof Segment>;

const nonDecreasing = (xs: number[]) =>
  xs.every((x, i) => i === 0 || x >= (xs[i - 1] ?? Number.NEGATIVE_INFINITY));

/** One chunk's segments, bounded to the chunk duration. */
function chunkOut(duration: number) {
  return z
    .array(Segment)
    .refine((segs) => nonDecreasing(segs.map((s) => s.start)), {
      message: "segment start times decrease",
    })
    .refine(
      (segs) =>
        !segs.length ||
        (Math.max(...segs.map((s) => s.start)) <= duration &&
          Math.max(...segs.map((s) => s.end)) <= duration + 2),
      {
        message: `segment times run past the chunk length ${duration.toFixed(1)}s`,
      },
    );
}

const Transcript = z.strictObject({
  recording_id: z.string().nullable(),
  model: z.string(),
  variant: z.enum(["flash-detailed", "flash-simple"]),
  chunk_seconds: z.number().nullable(),
  segments: z
    .array(Segment)
    .min(1, "segments must not be empty")
    .refine((segs) => nonDecreasing(segs.map((s) => s.start)), {
      message: "segment start times decrease",
    }),
});

// ---------------------------------------------------------------- retries

const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
const oneLine = (e: unknown, n: number) =>
  redactUrls(String((e as Error)?.message ?? e))
    .split(/\s+/)
    .join(" ")
    .slice(0, n);

/** Errors worth retrying; invalid model output (zod or JSON) counts. */
function transient(e: unknown): boolean {
  if (e instanceof ApiError) return RETRY_CODES.has(e.status);
  if (e instanceof z.ZodError || e instanceof SyntaxError) return true;
  const err = e as Error;
  return (
    err?.name === "AbortError" ||
    err?.name === "TimeoutError" ||
    (err instanceof TypeError && /fetch failed|network|socket/i.test(err.message))
  );
}

/** 5 attempts with random exponential backoff (max 120 s), like tenacity's with_retries. */
async function withRetries<T>(name: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= 5 || !transient(e)) throw e;
      console.log(`  retry ${name} attempt ${attempt}: ${(e as Error).name}: ${oneLine(e, 200)}`);
      await sleep(Math.random() * Math.min(120, 2 ** attempt));
    }
  }
}

// ---------------------------------------------------------------- audio

class AudioError extends Error {}

/**
 * Removes presigned S3 URLs from text before it reaches an error, a log or the database: a URL
 * carrying X-Amz-* parameters is replaced whole, and any X-Amz-* parameter left over (a URL cut
 * off at its start) loses its value.
 */
export function redactUrls(text: string): string {
  return text
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s'"<>]*x-amz-[^\s'"<>]*/gi, "<presigned-url>")
    .replace(/(x-amz-[a-z-]+)=[^&\s'"<>]*/gi, "$1=<redacted>");
}

// The binary path (null on an unsupported platform) is checked on first use, not at import, so a
// missing binary fails a transcription and not every module that imports this one.
function ffmpegBinary(): string {
  const ffmpegPath = ffmpegStatic;
  if (!ffmpegPath) throw new AudioError("ffmpeg-static has no ffmpeg binary for this platform");
  return ffmpegPath;
}

const STDERR_SUMMARY_MAX = 200;
const ERROR_LINE = /error|failed|server returned|no such file|invalid data|connection/i;

/**
 * The line of (already redacted) ffmpeg stderr that says what went wrong: the last one that reads
 * like an error, else the last non-empty one. A line over STDERR_SUMMARY_MAX keeps its start and
 * ends in an ellipsis.
 */
function summarizeStderr(stderr: string): string {
  const lines = stderr
    .split(/\r?\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);
  const line = lines.findLast((l) => ERROR_LINE.test(l)) ?? lines.at(-1) ?? "no output";
  return line.length > STDERR_SUMMARY_MAX ? `${line.slice(0, STDERR_SUMMARY_MAX - 1)}…` : line;
}

/** Run the bundled ffmpeg; on failure the error line of its stderr (redacted) is reported. */
function ffmpeg(args: string[], input?: Buffer): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBinary(), ["-nostdin", "-hide_banner", ...args], {
      stdio: [input ? "pipe" : "ignore", "pipe", "pipe"],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout?.on("data", (b: Buffer) => out.push(b));
    child.stderr?.on("data", (b: Buffer) => err.push(b));
    // The spawn error's message and spawnargs carry the input URL, so only its code is kept.
    child.on("error", (e: NodeJS.ErrnoException) =>
      reject(new AudioError(`ffmpeg could not start: ${e.code ?? "unknown error"}`)),
    );
    child.on("close", (code) => {
      const stderr = redactUrls(Buffer.concat(err).toString());
      if (code !== 0) {
        reject(new AudioError(`ffmpeg failed: ${summarizeStderr(stderr)}`));
        return;
      }
      resolve({ stdout: Buffer.concat(out), stderr });
    });
    if (input && child.stdin) {
      child.stdin.on("error", () => {}); // EPIPE when ffmpeg exits early; the exit code reports it
      child.stdin.end(input);
    }
  });
}

/** int16 samples over b, copied first when b starts at an odd byte (a small pooled Buffer). */
const toPcm = (b: Buffer) => {
  const aligned = b.byteOffset % 2 === 0 ? b : Buffer.from(b);
  return new Int16Array(aligned.buffer, aligned.byteOffset, Math.floor(aligned.length / 2));
};

export type AudioInput = { url: string } | { buffer: Buffer };

/**
 * Mono 16 kHz int16 samples and the container duration. The duration is read from the
 * "Duration: H:MM:SS.ss" line ffmpeg prints for the input (what ffprobe reports, to 10 ms), so no
 * ffprobe is needed. ffmpeg exits 0 on some corrupt files, so the decoded length is compared with
 * it. A URL is read with HTTP range requests, so an m4a whose index is at the end works without
 * the file ever being held in memory. A piped buffer often has no duration (Duration: N/A); then
 * the decoded length stands in and the truncation check is skipped.
 */
async function decodePcm(input: AudioInput): Promise<{ pcm: Int16Array; duration: number }> {
  const source =
    "url" in input ? ["-rw_timeout", String(READ_TIMEOUT_US), "-i", input.url] : ["-i", "pipe:0"];
  const { stdout, stderr } = await ffmpeg(
    ["-v", "info", "-nostats", ...source, "-f", "s16le", "-ac", "1", "-ar", String(SR), "pipe:1"],
    "buffer" in input ? input.buffer : undefined,
  );
  const pcm = toPcm(stdout);
  const decoded = pcm.length / SR;
  const m = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(stderr);
  if (!m) {
    if ("buffer" in input && decoded > 0) return { pcm, duration: decoded };
    throw new AudioError("ffmpeg could not read the duration of the recording");
  }
  const probed = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  if (decoded < DECODE_MIN_RATIO * probed)
    throw new AudioError(
      `decoded only ${decoded.toFixed(1)}s of ${probed.toFixed(1)}s ` +
        `(${((100 * decoded) / probed).toFixed(1)}%); the file looks truncated or corrupt`,
    );
  return { pcm, duration: probed };
}

/** Mono 16 kHz 64 kbps mp3 bytes for a PCM slice; the length is verified within 1 s. */
async function encodeMp3(pcm: Int16Array): Promise<Buffer> {
  const raw = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const { stdout: mp3 } = await ffmpeg(
    [
      "-v",
      "error",
      "-f",
      "s16le",
      "-ar",
      String(SR),
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "64k",
      "-ar",
      "16000",
      "-f",
      "mp3",
      "pipe:1",
    ],
    raw,
  );
  const { stdout: back } = await ffmpeg(
    ["-v", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", "16000", "pipe:1"],
    mp3,
  );
  const expected = pcm.length / SR;
  const got = back.length / 2 / 16000;
  if (Math.abs(got - expected) > 1)
    throw new AudioError(`encoded chunk is ${got.toFixed(1)}s, expected ${expected.toFixed(1)}s`);
  return mp3;
}

/** RMS level in dB (int16 scale) per frame. */
function frameDb(pcm: Int16Array, frame: number): Float64Array {
  const n = Math.floor(pcm.length / frame);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = i * frame; j < (i + 1) * frame; j++) {
      const sample = pcm[j] ?? 0;
      sum += sample * sample;
    }
    out[i] = 20 * Math.log10(Math.sqrt(sum / frame) + 1);
  }
  return out;
}

/** numpy.percentile with linear interpolation. */
function percentile(xs: Float64Array, p: number): number {
  const s = xs.toSorted();
  const idx = ((s.length - 1) * p) / 100;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, s.length - 1);
  const low = s[lo] ?? 0;
  return low + ((s[hi] ?? 0) - low) * (idx - lo);
}

type Found = { at: number; length: number } | null;

/** total seconds, thresholds strictest first, and longest(thr, lo, hi) for a PCM array. */
function finder(pcm: Int16Array) {
  const total = pcm.length / SR;
  const frame = SR / 50;
  const fs = frame / SR;
  const db = pcm.length >= frame ? frameDb(pcm, frame) : new Float64Array(0);
  const [floor, peak] = db.length ? [percentile(db, 0.1), percentile(db, 95)] : [0, 0];
  const ladder = peak - floor >= MIN_RANGE_DB ? LADDER_DB.map((x) => peak - x) : [];
  const cache = new Map<number, [number, number][]>(); // threshold -> silences [start_s, end_s] long enough to use

  function silences(thr: number) {
    let runs = cache.get(thr);
    if (!runs) {
      runs = [];
      let start = -1;
      for (let i = 0; i <= db.length; i++) {
        const quiet = i < db.length && (db[i] ?? 0) < thr;
        if (quiet && start < 0) start = i;
        else if (!quiet && start >= 0) {
          if ((i - start) * fs >= MIN_SILENCE_S) runs.push([start * fs, i * fs]);
          start = -1;
        }
      }
      cache.set(thr, runs);
    }
    return runs;
  }

  function longest(thr: number, lo: number, hi: number): Found {
    let best: Found = null;
    for (const [s, e] of silences(thr)) {
      const a = Math.max(s, lo);
      const b = Math.min(e, hi);
      if (!best || b - a > best.length) best = { at: (a + b) / 2, length: b - a };
    }
    return best && best.length >= MIN_SILENCE_S ? best : null;
  }
  return { total, ladder, longest };
}

type Plan = { chunks: [number, number][]; hardCuts: number };

/** Contiguous chunks of about chunkSeconds cut at the best nearby silence. */
function planChunks(pcm: Int16Array, chunkSeconds: number): Plan {
  const { total, ladder, longest } = finder(pcm);
  const cuts: { at: number; kind: "silence" | "hard" }[] = [];
  let prev = 0;
  for (let k = 1; k * chunkSeconds < total; k++) {
    const target = k * chunkSeconds;
    let found: Found = null;
    for (const thr of ladder) {
      // strictest threshold first
      found =
        longest(thr, Math.max(target - LOOK_BEFORE_S, prev + 30), target) ??
        longest(thr, Math.max(target, prev + 30), Math.min(target + LOOK_AFTER_S, total));
      if (found) break;
    }
    const cut = found
      ? { at: round3(found.at), kind: "silence" as const }
      : { at: Math.max(target, prev + 30), kind: "hard" as const };
    cuts.push(cut);
    if (cut.at <= prev) throw new Error("chunk cuts must increase");
    prev = cut.at;
  }
  const lastCut = cuts.at(-1);
  if (lastCut && total - lastCut.at < MIN_TAIL_S) cuts.pop();
  const edges = [0, ...cuts.map((c) => c.at), total];
  return {
    chunks: edges.slice(0, -1).map((a, i): [number, number] => [a, edges[i + 1] ?? total]),
    hardCuts: cuts.filter((c) => c.kind === "hard").length,
  };
}

/** Where to split a chunk in two: the longest silence within the middle third, else the midpoint. */
function splitPoint(pcm: Int16Array): { at: number; kind: "silence" | "hard" } {
  const { total, ladder, longest } = finder(pcm);
  for (const thr of ladder) {
    const found = longest(thr, total / 3, (2 * total) / 3);
    if (found) return { at: round3(found.at), kind: "silence" };
  }
  return { at: round3(total / 2), kind: "hard" };
}

// ---------------------------------------------------------------- Files API

function makeClient(apiKey: string): GoogleGenAI {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: REQUEST_TIMEOUT_S * 1000 },
  });
}

/** The Files API name and URI of an upload; both are always set on a returned file. */
function fileName(f: GenaiFile): string {
  if (!f.name) throw new Error("uploaded file has no name");
  return f.name;
}

/**
 * Zero-data-retention account: remove this recording's uploads left by an earlier run that was
 * killed before its finally blocks ran. Other recordings' uploads may be in use by concurrent runs,
 * so only names with this recording's prefix are touched.
 */
async function cleanupLeftovers(ai: GoogleGenAI, uploadPrefix: string, label: string) {
  const leftovers: string[] = [];
  for await (const f of await ai.files.list()) {
    if ((f.displayName ?? "").startsWith(uploadPrefix) && f.name) leftovers.push(f.name);
  }
  for (const name of leftovers) await withRetries("delete", () => ai.files.delete({ name }));
  if (leftovers.length)
    console.log(`[${label}] cleanup: ${leftovers.length} leftover upload(s) deleted`);
}

/** Upload bytes (no file on disk) and wait until ACTIVE; a failed attempt deletes its upload. */
function upload(
  ai: GoogleGenAI,
  data: Buffer,
  uploadPrefix: string,
  mimeType = "audio/mpeg",
): Promise<GenaiFile> {
  return withRetries("upload", async () => {
    let f = await ai.files.upload({
      file: new Blob([new Uint8Array(data)], { type: mimeType }),
      config: {
        displayName: uploadPrefix + randomBytes(8).toString("hex"),
        mimeType,
      },
    });
    try {
      const deadline = Date.now() + ACTIVE_TIMEOUT_S * 1000;
      while (f.state !== "ACTIVE") {
        if (f.state === "FAILED") throw new Error("uploaded file processing FAILED");
        if (Date.now() > deadline) throw new Error(`file not ACTIVE after ${ACTIVE_TIMEOUT_S}s`);
        await sleep(POLL_SLEEP_S);
        f = await ai.files.get({ name: fileName(f) });
      }
      return f;
    } catch (e) {
      await ai.files.delete({ name: fileName(f) }).catch(() => {}); // cleanupLeftovers catches anything left behind
      throw e;
    }
  });
}

/** Delete in a finally block: a 404 is fine, anything else is reported, never thrown. */
async function deleteUpload(ai: GoogleGenAI, f: GenaiFile, label: string) {
  try {
    await withRetries("delete", () => ai.files.delete({ name: fileName(f) }));
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404))
      console.log(`[${label}] WARNING upload not deleted: ${oneLine(e, 200)}`);
  }
}

// ------------------------------------------------------------------- API calls

/** The response hit the output-token cap (never retried as is; the chunk is split). */
class MaxTokens extends Error {}
/** No candidates or a blocked response (retried a few times, then the chunk is split). */
class Blocked extends Error {}

type Args = {
  model: string;
  prompt: PromptName;
  temperature?: number;
  maxOutputTokens: number;
  chunkMinutes: number;
  uploadPrefix: string;
};

/** One generation for a chunk or part, parsed and validated (invalid output is retried). */
function generateChunk(
  ai: GoogleGenAI,
  args: Args,
  uploaded: GenaiFile,
  chunk: number,
  duration: number,
  rawBox: string[],
) {
  return withRetries("generate_chunk", async (): Promise<Segment[]> => {
    if (!uploaded.uri || !uploaded.mimeType) throw new Error("uploaded file has no URI");
    const resp = await ai.models.generateContent({
      model: args.model,
      contents: [createPartFromUri(uploaded.uri, uploaded.mimeType), PROMPTS[args.prompt]],
      config: {
        maxOutputTokens: args.maxOutputTokens,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, // lowest level gemini-3.8-flash accepts
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
      },
    });
    const u = resp.usageMetadata;
    if (u)
      console.log(
        `  chunk ${chunk} tokens: input=${u.promptTokenCount} output=${u.candidatesTokenCount}`,
      );
    const cands = resp.candidates ?? [];
    const reason = cands.length ? (cands[0]?.finishReason ?? null) : "NO_CANDIDATES";
    const block = resp.promptFeedback?.blockReason;
    if (reason === "NO_CANDIDATES" || block || (reason && BLOCKED_FINISH.has(reason))) {
      const msg = resp.promptFeedback?.blockReasonMessage;
      throw new Blocked(
        `${reason}, block reason ${block ?? "none"}${msg ? ` (${msg.slice(0, 80)})` : ""}`,
      );
    }
    if (reason === "MAX_TOKENS") throw new MaxTokens("finish reason MAX_TOKENS");
    if (reason !== "STOP") throw new Error(`finish reason ${reason}`); // not transient: never retried
    const raw = resp.text ?? "";
    rawBox.push(raw);
    const parsed = ApiResponse.parse(JSON.parse(raw));
    return chunkOut(duration).parse(parsed.segments.map((s) => ({ chunk, ...s })));
  });
}

/** generateChunk, retrying a blocked or empty response up to BLOCK_RETRIES times. */
async function generatePart(
  ai: GoogleGenAI,
  args: Args,
  uploaded: GenaiFile,
  chunk: number,
  duration: number,
  rawBox: string[],
  label: string,
  stats: Stats,
) {
  for (let n = 0; ; n++) {
    try {
      return await generateChunk(ai, args, uploaded, chunk, duration, rawBox);
    } catch (e) {
      if (!(e instanceof Blocked)) throw e;
      console.log(
        `[${label}] chunk ${chunk} (${duration.toFixed(0)}s): ${e.message} (try ${n + 1}/${BLOCK_RETRIES + 1})`,
      );
      if (n === BLOCK_RETRIES) throw e;
      stats.blockRetries++;
      await sleep(BLOCK_BACKOFF_S * (n + 1));
    }
  }
}

type Stats = { splits: number; hard: number; blockRetries: number };

/** Segments (times local to pcm) for one chunk or part; splits it after MAX_TOKENS or blocks. */
async function transcribeSpan(
  ai: GoogleGenAI,
  args: Args,
  pcm: Int16Array,
  chunk: number,
  label: string,
  stats: Stats,
): Promise<Segment[]> {
  const duration = pcm.length / SR;
  const rawBox: string[] = [];
  let uploaded: GenaiFile | undefined;
  let segs: Segment[] = [];
  let why = "";
  try {
    uploaded = await upload(ai, await encodeMp3(pcm), args.uploadPrefix);
    try {
      segs = await generatePart(ai, args, uploaded, chunk, duration, rawBox, label, stats);
      if (!segs.length)
        segs = await generatePart(ai, args, uploaded, chunk, duration, rawBox, label, stats); // an empty chunk is retried once
      if (!segs.length) throw new Error(`chunk ${chunk} returned no segments twice`);
    } catch (e) {
      if (!(e instanceof MaxTokens || e instanceof Blocked)) throw e;
      why = e.message;
    }
  } catch (e) {
    // The script saved the raw response to a .failed.txt file. It is speech from a school
    // session, so only its length goes to the logs.
    const raw = rawBox.at(-1);
    if ((e instanceof z.ZodError || e instanceof SyntaxError) && raw !== undefined)
      console.log(`[${label}] chunk ${chunk}: invalid response of ${raw.length} chars`);
    throw e;
  } finally {
    if (uploaded) await deleteUpload(ai, uploaded, label);
  }
  if (!why) return segs;
  if (duration <= MIN_PART_S)
    throw new Error(
      `chunk ${chunk}: ${why} on a ${duration.toFixed(0)}s part (minimum part length ${MIN_PART_S}s), giving up`,
    );
  const cut = splitPoint(pcm);
  stats.splits++;
  if (cut.kind === "hard") stats.hard++;
  console.log(
    `[${label}] chunk ${chunk}: ${why} on ${duration.toFixed(0)}s, splitting at ${cut.at.toFixed(1)}s (${cut.kind})`,
  );
  const at = Math.round(cut.at * SR);
  const left = await transcribeSpan(ai, args, pcm.subarray(0, at), chunk, label, stats);
  const right = await transcribeSpan(ai, args, pcm.subarray(at), chunk, label, stats);
  return [
    ...left,
    ...right.map((s) => ({
      ...s,
      start: round3(s.start + cut.at),
      end: round3(s.end + cut.at),
    })),
  ];
}

/** Warnings for one chunk's local segments. */
function qualityWarnings(chunk: number, segments: Segment[], detailed: boolean): string[] {
  if (!segments.length) return [`chunk ${chunk}: no segments`];
  const w: string[] = [];
  segments.forEach((s, i) => {
    const before = segments[i - 1];
    if (!before) return;
    const gap = s.start - before.end;
    if (gap > 60) w.push(`chunk ${chunk}: gap of ${gap.toFixed(0)}s at ${before.end.toFixed(0)}s`);
  });
  let runLength = 0;
  let prev: string | null = null;
  for (const s of segments) {
    runLength = s.text === prev ? runLength + 1 : 1;
    prev = s.text;
    if (runLength === 6)
      w.push(
        `chunk ${chunk}: text repeated more than 5 times in a row: ${JSON.stringify(prev.slice(0, 40))}`,
      );
  }
  if (detailed && !segments.some((s) => s.role === "facilitator"))
    w.push(`chunk ${chunk}: no facilitator segment`);
  return w;
}

// ------------------------------------------------------------------------ job

export type TranscribeOptions = {
  apiKey: string;
  model?: string;
  prompt?: PromptName;
  temperature?: number;
  maxOutputTokens?: number;
  chunkMinutes?: number;
  /** Names the run in logs and Gemini upload names; the recording ID. */
  recordingId: string;
};

export type TranscribeResult = {
  model: string;
  variant: z.output<typeof Transcript>["variant"];
  chunkSeconds: number | null;
  segments: TranscriptSegment[];
  warnings: string[];
  durationSeconds: number;
  chunks: number;
  hardCuts: number;
  stats: Stats;
};

function resolveArgs(options: TranscribeOptions): Args {
  const args: Args = {
    model: options.model ?? DEFAULT_MODEL,
    prompt: options.prompt ?? "detailed",
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    chunkMinutes: options.chunkMinutes ?? DEFAULT_CHUNK_MINUTES,
    uploadPrefix: `${UPLOAD_PREFIX}${options.recordingId}-`,
  };
  if (!(args.chunkMinutes >= MIN_CHUNK_MINUTES && args.chunkMinutes <= MAX_CHUNK_MINUTES))
    throw new Error(`chunkMinutes must be between ${MIN_CHUNK_MINUTES} and ${MAX_CHUNK_MINUTES}`);
  if (
    !(
      Number.isInteger(args.maxOutputTokens) &&
      args.maxOutputTokens >= 1 &&
      args.maxOutputTokens <= MODEL_MAX_OUTPUT_TOKENS
    )
  )
    throw new Error(`maxOutputTokens must be between 1 and ${MODEL_MAX_OUTPUT_TOKENS}`);
  if (args.temperature !== undefined && Number.isNaN(args.temperature))
    throw new Error("temperature must be a number");
  return args;
}

/** Transcribe one recording; throws on failure, with presigned URLs redacted from the message. */
export async function transcribeAudio(
  input: AudioInput,
  options: TranscribeOptions,
): Promise<TranscribeResult> {
  const started = performance.now();
  const label = options.recordingId;
  const stats: Stats = { splits: 0, hard: 0, blockRetries: 0 };
  const warnings: string[] = [];
  const elapsed = () => ((performance.now() - started) / 1000).toFixed(1);
  try {
    const args = resolveArgs(options);
    const ai = makeClient(options.apiKey);
    await cleanupLeftovers(ai, args.uploadPrefix, label);
    const { pcm, duration } = await decodePcm(input);
    const plan = planChunks(pcm, args.chunkMinutes * 60);
    console.log(
      `[${label}] ${duration.toFixed(0)}s -> ${plan.chunks.length} chunk(s), ${plan.hardCuts} hard cut(s)`,
    );
    const merged: Segment[] = [];
    for (const [i, [a, b]] of plan.chunks.entries()) {
      const before = stats.splits;
      const segs = await transcribeSpan(
        ai,
        args,
        pcm.subarray(Math.round(a * SR), Math.round(b * SR)),
        i,
        label,
        stats,
      );
      if (stats.splits > before)
        warnings.push(
          `chunk ${i}: split ${stats.splits - before} time(s) after MAX_TOKENS or a blocked response`,
        );
      warnings.push(...qualityWarnings(i, segs, args.prompt === "detailed"));
      merged.push(
        ...segs.map((s) => ({
          ...s,
          start: round3(s.start + a),
          end: round3(s.end + a),
        })),
      );
    }
    const lastEnd = Math.max(...merged.map((s) => s.end));
    if (merged.length && lastEnd > duration + 2)
      throw new Error(
        `last end ${lastEnd} is more than 2s past the audio duration ${duration.toFixed(1)}`,
      );
    const t = Transcript.parse({
      recording_id: options.recordingId,
      model: args.model,
      variant: `flash-${args.prompt}`,
      chunk_seconds: plan.chunks.length > 1 ? args.chunkMinutes * 60 : null,
      segments: merged,
    });
    for (const w of warnings) console.log(`[${label}] WARNING ${w}`);
    console.log(
      `[${label}] OK ${plan.chunks.length} chunks, ${plan.hardCuts} hard cuts, ${stats.splits} splits (${stats.hard} hard), ` +
        `${stats.blockRetries} block retries, ${t.segments.length} segments, last end ${t.segments.at(-1)?.end}s, ` +
        `elapsed ${elapsed()}s`,
    );
    return {
      model: t.model,
      variant: t.variant,
      chunkSeconds: t.chunk_seconds,
      segments: t.segments,
      warnings,
      durationSeconds: duration,
      chunks: plan.chunks.length,
      hardCuts: plan.hardCuts,
      stats,
    };
  } catch (e) {
    const message = oneLine(e, 300);
    console.log(
      `[${label}] FAILED ${(e as Error).name}: ${message} ` +
        `(${stats.splits} splits, ${stats.blockRetries} block retries, elapsed ${elapsed()}s)`,
    );
    // oxlint-disable-next-line eslint/preserve-caught-error -- the original may hold a presigned URL
    throw new Error(message);
  }
}
