import "server-only";

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { setTimeout } from "node:timers/promises";

import { FinishReason, GoogleGenAI, Type } from "@google/genai";
import ffmpegPath from "ffmpeg-static";
import { z } from "zod";

// The configuration the eval measured best (evaluation-fidelity-monitoring, evals/ralph/BACKLOG.md
// §2b): change the model or the prompt only after re-running that eval.
export const TRANSCRIPTION_MODEL = "gemini-3.7-flash";
export const PROMPT_VERSION = "v1";
const PROMPT = readFileSync(
  path.join(process.cwd(), "lib/transcription/prompts", `${PROMPT_VERSION}.txt`),
  "utf8",
);
export const PROMPT_SHA256 = createHash("sha256").update(PROMPT).digest("hex");

const MAX_CHUNK_SECONDS = 600;
const CHUNKS_IN_FLIGHT = 6;
// ffmpeg exits 0 after skipping corrupt frames, so a short decode is only visible by comparing
// lengths (FINDINGS 574-624: mp2 streams in .MP3 files lose 2-16%). Encoder padding alone loses
// about 0.1 s, which the 1 s floor absorbs on short files.
const MAX_LOST_RATIO = 0.005;
const MAX_LOST_SECONDS = 1;
// Sessions run to about 75 minutes. A longer file is the wrong upload or a recorder left on, so it
// is refused before any Gemini call.
export const MAX_AUDIO_SECONDS = 120 * 60;

export type TranscriptSegment = { start: number; end: number; text: string };
export type TranscriptGap = {
  start: number;
  end: number;
  reason: "empty" | "max_tokens" | "blocked";
};
export type Transcript = {
  segments: TranscriptSegment[];
  gaps: TranscriptGap[];
  audioSeconds: number;
  chunkCount: number;
};

/** The recording cannot be transcribed honestly; retrying will not help. */
/** The supervisor has to upload another file: retrying cannot help. */
export class UnusableAudioError extends Error {}

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      start: { type: Type.NUMBER },
      end: { type: Type.NUMBER },
    },
    required: ["text", "start", "end"],
  },
};
const ChunkSegments = z.array(z.object({ text: z.string(), start: z.number(), end: z.number() }));

/** Equal chunks of at most 600 s, so no chunk is a few-second tail. */
export function planChunks(audioSeconds: number): { start: number; seconds: number }[] {
  const count = Math.max(1, Math.ceil(audioSeconds / MAX_CHUNK_SECONDS));
  const seconds = audioSeconds / count;
  return Array.from({ length: count }, (_, i) => ({ start: i * seconds, seconds }));
}

const toSeconds = (hms: RegExpMatchArray) =>
  Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);

/** The input's declared duration and the decoded output's length, from ffmpeg's stderr. */
export function readDurations(stderr: string): { declared: number; decoded: number } | null {
  const declared = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  const decoded = [...stderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].at(-1);
  return declared && decoded
    ? { declared: toSeconds(declared), decoded: toSeconds(decoded) }
    : null;
}

// Presigned URLs carry credentials, and ffmpeg echoes its input URL in errors.
const redact = (text: string) => text.replace(/(X-Amz-[A-Za-z-]+)=[^&\s'"]+/g, "$1=<redacted>");

function ffmpeg(args: string[], signal: AbortSignal, input?: Buffer) {
  if (!ffmpegPath) throw new Error("ffmpeg-static has no binary for this platform");
  const child = spawn(ffmpegPath, ["-hide_banner", "-nostdin", ...args], { signal });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
  child.stdin.on("error", () => {}); // EPIPE when ffmpeg exits early; the exit code reports it
  child.stdin.end(input);
  return new Promise<{ stdout: Buffer; stderr: string }>((resolve, reject) => {
    child.on("error", (error) => reject(new Error(`ffmpeg: ${redact(error.message)}`)));
    child.on("close", (code) => {
      const log = redact(Buffer.concat(stderr).toString());
      if (code === 0) resolve({ stdout: Buffer.concat(stdout), stderr: log });
      else reject(new Error(`ffmpeg exited ${code}: ${log.trim().split("\n").at(-1) ?? ""}`));
    });
  });
}

/**
 * Reads the recording from a URL (so ffmpeg can seek in an m4a or mp4 whose index is at the end)
 * into mono 16 kHz 64 kbps mp3, the encoding the eval measured.
 */
async function prepareAudio(url: string, signal: AbortSignal) {
  const { stdout, stderr } = await ffmpeg(
    [
      "-rw_timeout",
      "30000000",
      "-i",
      url,
      ..."-vn -ac 1 -ar 16000 -b:a 64k -f mp3 pipe:1".split(" "),
    ],
    signal,
  );
  const durations = readDurations(stderr);
  if (!durations) throw new UnusableAudioError("ffmpeg could not read the recording's duration");
  const lostSeconds = durations.declared - durations.decoded;
  if (lostSeconds > Math.max(MAX_LOST_SECONDS, MAX_LOST_RATIO * durations.declared)) {
    const minutes = (s: number) => (s / 60).toFixed(1);
    throw new UnusableAudioError(
      `The audio file is damaged: only ${minutes(durations.decoded)} of ` +
        `${minutes(durations.declared)} minutes could be read. Re-export the recording and upload it again.`,
    );
  }
  return { mp3: stdout, audioSeconds: durations.decoded };
}

async function cutChunk(mp3: Buffer, start: number, seconds: number, signal: AbortSignal) {
  const { stdout } = await ffmpeg(
    [
      "-i",
      "pipe:0",
      "-ss",
      start.toFixed(3),
      "-t",
      seconds.toFixed(3),
      "-c",
      "copy",
      "-f",
      "mp3",
      "pipe:1",
    ],
    signal,
    mp3,
  );
  return stdout;
}

type ChunkResult = { segments: TranscriptSegment[] } | { gap: TranscriptGap["reason"] };

// The SDK retries HTTP errors and timeouts but not a failed connection, which fetch reports as a
// TypeError ("fetch failed"). The eval lost 136 of 170 sessions to connect timeouts.
async function request(ai: GoogleGenAI, audio: Buffer, signal: AbortSignal) {
  for (let attempt = 1; ; attempt++) {
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- each retry waits for the one before
      return await ai.models.generateContent({
        model: TRANSCRIPTION_MODEL,
        contents: [
          { inlineData: { mimeType: "audio/mpeg", data: audio.toString("base64") } },
          PROMPT,
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          maxOutputTokens: 65536,
          thinkingConfig: { thinkingBudget: 1024 },
          abortSignal: signal,
        },
      });
    } catch (error) {
      if (!(error instanceof TypeError) || signal.aborted || attempt === 3) throw error;
      // oxlint-disable-next-line eslint/no-await-in-loop -- backoff before the next attempt
      await setTimeout(2000 * 2 ** attempt, undefined, { signal });
    }
  }
}

async function generate(ai: GoogleGenAI, audio: Buffer, signal: AbortSignal): Promise<ChunkResult> {
  const response = await request(ai, audio, signal);
  const finish = response.candidates?.[0]?.finishReason;
  if (finish === FinishReason.MAX_TOKENS) return { gap: "max_tokens" };
  if (!response.candidates?.length || (finish && finish !== FinishReason.STOP))
    return { gap: "blocked" };
  const parsed = ChunkSegments.safeParse(parseJson(response.text || "[]"));
  // The parse error would quote the model's output, which is speech from a session with minors.
  if (!parsed.success) throw new Error("Gemini returned a transcript that is not a segment list");
  const segments = parsed.data.filter((s) => s.start >= 0 && s.end >= s.start && s.text.trim());
  return segments.length ? { segments } : { gap: "empty" };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * A chunk the model refuses is answered again once. Refused twice, its span becomes a gap: 8% of
 * cohort-2 recordings have a chunk the model refuses every time, so failing the run would leave
 * those uploads with no transcript at all.
 */
async function transcribeChunk(ai: GoogleGenAI, audio: Buffer, signal: AbortSignal) {
  const first = await generate(ai, audio, signal);
  return "gap" in first ? generate(ai, audio, signal) : first;
}

async function inParallel<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>) {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    /* oxlint-disable eslint/no-await-in-loop -- each worker takes the next item when it is free */
    for (let i = next++; i < items.length; i = next++) results[i] = await run(items[i] as T);
    /* oxlint-enable eslint/no-await-in-loop */
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const round = (s: number) => Math.round(s * 1000) / 1000;

// The longest non-decreasing subsequence. ponytail: O(n²), fine for a chunk's ~200 lines.
function inOrderIndexes(times: number[]) {
  const length = times.map(() => 1);
  const previous = times.map(() => -1);
  times.forEach((time, i) => {
    for (let j = 0; j < i; j++) {
      if ((times[j] ?? 0) <= time && (length[j] ?? 0) + 1 > (length[i] ?? 0)) {
        length[i] = (length[j] ?? 0) + 1;
        previous[i] = j;
      }
    }
  });
  const kept = new Set<number>();
  for (let i = length.indexOf(Math.max(...length)); i !== -1; i = previous[i] ?? -1) kept.add(i);
  return kept;
}

/**
 * Moves a chunk's segments to recording time. Gemini writes the times rather than measuring them:
 * they run late through a chunk (12 s past the end of a 9-minute chunk on preview), so a chunk that
 * overruns is scaled back to its length, and a line stamped out of order with lines that are in
 * order around it (27:41 between 33:40 and 33:48) is moved to the midpoint of its neighbours.
 */
export function placeSegments(segments: TranscriptSegment[], start: number, seconds: number) {
  const inOrder = inOrderIndexes(segments.map((s) => s.start));
  const ordered = segments.map((s, i) => {
    if (inOrder.has(i)) return s;
    const before = segments.findLast((_, j) => j < i && inOrder.has(j))?.start ?? 0;
    const after = segments.find((_, j) => j > i && inOrder.has(j))?.start ?? before;
    const moved = (before + after) / 2;
    // The end can be right when the start is wrong, so it is kept if it fits after the new start.
    return { ...s, start: moved, end: Math.min(Math.max(s.end, moved), after) };
  });
  const lastEnd = Math.max(...ordered.map((s) => s.end));
  const scale = lastEnd > seconds ? seconds / lastEnd : 1;
  return ordered.map((s) => ({
    ...s,
    start: round(start + s.start * scale),
    end: round(start + s.end * scale),
  }));
}

/** Transcribes the audio at `url`; throws UnusableAudioError when it is damaged or too long. */
export async function transcribeAudio(url: string, signal: AbortSignal): Promise<Transcript> {
  const { mp3, audioSeconds } = await prepareAudio(url, signal);
  if (audioSeconds > MAX_AUDIO_SECONDS) {
    const minutes = Math.round(audioSeconds / 60);
    throw new UnusableAudioError(
      `The recording is ${Math.floor(minutes / 60)} h ${minutes % 60} min long, longer than any ` +
        "session. Check that the right file was uploaded.",
    );
  }
  const chunks = planChunks(audioSeconds);
  // Vertex AI or an API key, from GOOGLE_GENAI_USE_VERTEXAI / GOOGLE_CLOUD_PROJECT /
  // GOOGLE_CLOUD_LOCATION or GEMINI_API_KEY. Each attempt times out after 300 s; the SDK retries
  // 408, 429, 5xx, network errors and timeouts, and stops once `signal` aborts.
  const ai = new GoogleGenAI({
    httpOptions: { timeout: 300_000, retryOptions: { attempts: 5 } },
  });

  // One failed chunk fails the run, so the chunks still in flight stop instead of being paid for.
  const failed = new AbortController();
  const chunkSignal = AbortSignal.any([signal, failed.signal]);
  const results = await inParallel(chunks, CHUNKS_IN_FLIGHT, async ({ start, seconds }) => {
    try {
      const audio = await cutChunk(mp3, start, seconds, chunkSignal);
      return { start, end: start + seconds, result: await transcribeChunk(ai, audio, chunkSignal) };
    } catch (error) {
      failed.abort();
      throw error;
    }
  });

  const transcript = {
    segments: results.flatMap(({ start, end, result }) =>
      "segments" in result ? placeSegments(result.segments, start, end - start) : [],
    ),
    gaps: results.flatMap(({ start, end, result }) =>
      "gap" in result ? [{ start: round(start), end: round(end), reason: result.gap }] : [],
    ),
    audioSeconds: round(audioSeconds),
    chunkCount: chunks.length,
  };
  // Gaps are kept when part of a session is missing; a run with no speech at all is a failure.
  if (transcript.segments.length === 0) throw new Error("Gemini transcribed none of the recording");
  return transcript;
}
