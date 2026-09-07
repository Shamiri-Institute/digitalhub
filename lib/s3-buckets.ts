export const S3_BUCKETS = ["recordings", "student-attendance"] as const;

export type S3Bucket = (typeof S3_BUCKETS)[number];
