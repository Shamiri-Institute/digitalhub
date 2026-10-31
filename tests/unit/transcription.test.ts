// @vitest-environment node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import ffmpegPath from "ffmpeg-static";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DamagedAudioError,
  PROMPT_SHA256,
  placeSegments,
  planChunks,
  readDurations,
  transcribeAudio,
} from "#/lib/transcription/transcribe";

// A shipped prompt is never edited: transcripts record which version they used, and v1 is the
// prompt the eval measured. A change is a new file with its own hash here.
const SHIPPED_PROMPTS: Record<string, string> = {
  "v1.txt": "c4aff233cbfe81a4d80c20d7766d6cc9390924ac1871da5e3fa520b1efe73197",
};

describe("transcription prompts", () => {
  it("never change once shipped", () => {
    const dir = path.join(process.cwd(), "lib/transcription/prompts");
    const hashes = Object.fromEntries(
      readdirSync(dir).map((file) => [
        file,
        createHash("sha256")
          .update(readFileSync(path.join(dir, file)))
          .digest("hex"),
      ]),
    );
    expect(hashes).toEqual(SHIPPED_PROMPTS);
    expect(PROMPT_SHA256).toBe(SHIPPED_PROMPTS["v1.txt"]);
  });
});

describe("planChunks", () => {
  it("cuts equal chunks of at most 600 s, with no short tail", () => {
    expect(planChunks(2468.95).map((c) => c.seconds.toFixed(2))).toEqual(Array(5).fill("493.79"));
    expect(planChunks(601).map((c) => c.start)).toEqual([0, 300.5]);
    expect(planChunks(600)).toEqual([{ start: 0, seconds: 600 }]);
    expect(planChunks(45)).toEqual([{ start: 0, seconds: 45 }]);
  });
});

describe("placeSegments", () => {
  it("offsets a chunk's segments to recording time", () => {
    expect(placeSegments([{ start: 1, end: 2.5, text: "a" }], 540, 540)).toEqual([
      { start: 541, end: 542.5, text: "a" },
    ]);
  });

  it("scales a chunk whose times run past its end back inside it", () => {
    const overrun = [
      { start: 0, end: 300, text: "a" },
      { start: 540, end: 552, text: "b" },
    ];
    expect(placeSegments(overrun, 1620, 540)).toEqual([
      { start: 1620, end: 1913.478, text: "a" },
      { start: 2148.261, end: 2160, text: "b" },
    ]);
  });

  it("moves a line stamped out of order to the midpoint of its neighbours", () => {
    // Chunk-local times from the 45-minute preview run: "Take a moment" came back as 27:41.
    const outOfOrder = [
      { start: 396, end: 400, text: "Part 89." },
      { start: 41, end: 403, text: "Take a moment" },
      { start: 404, end: 407, text: "Turn to the person" },
    ];
    expect(placeSegments(outOfOrder, 1620, 540).map((s) => [s.start, s.end])).toEqual([
      [2016, 2020],
      [2020, 2023],
      [2024, 2027],
    ]);
  });
});

describe("readDurations", () => {
  it("reads the declared duration and the last progress time", () => {
    const stderr =
      "Duration: 00:51:24.29, start: 0.000000, bitrate: 128 kb/s\n" +
      "size=  100kB time=00:10:00.00 bitrate=64.0kbits/s\rsize=  23088kB time=00:49:15.24 bitrate=64.0kbits/s";
    expect(readDurations(stderr)).toEqual({ declared: 3084.29, decoded: 2955.24 });
    expect(readDurations("no duration here")).toBeNull();
  });
});

describe("transcribeAudio", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "transcription-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("refuses a file ffmpeg cannot decode in full, before calling Gemini", async () => {
    if (!ffmpegPath) throw new Error("ffmpeg-static has no binary for this platform");
    const tone = path.join(dir, "tone.mp3");
    const args = "-loglevel error -f lavfi -i sine=frequency=440:duration=60 -ac 1 -b:a 64k";
    execFileSync(ffmpegPath, [...args.split(" "), tone]);
    // Zeroed frames make ffmpeg skip ahead and still exit 0, as mp2 streams in .MP3 files do.
    const bytes = readFileSync(tone);
    const third = Math.floor(bytes.length / 3);
    bytes.fill(0, third, third + Math.floor(bytes.length / 5));
    const damaged = path.join(dir, "damaged.mp3");
    writeFileSync(damaged, bytes);

    await expect(transcribeAudio(damaged, AbortSignal.timeout(60_000))).rejects.toThrow(
      DamagedAudioError,
    );
  });
});
