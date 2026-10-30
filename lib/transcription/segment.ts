// Times are seconds from the start of the recording; chunk is the index of the chunk the segment came from.
export type TranscriptSegment = {
  chunk: number;
  role: "facilitator" | "student";
  start: number;
  end: number;
  text: string;
};
