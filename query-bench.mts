import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const supervisorId = process.argv[2];
const N = 50;

const baseInclude = {
  student: {
    include: { school: { select: { schoolName: true } }, assignedGroup: { select: { groupName: true } } },
  },
  sessions: true,
  followUptreatmentPlan: true,
} as const;

async function run(label: string, include: object) {
  const times: number[] = [];
  let bytes = 0;
  let rows = 0;
  let noteRows = 0;
  for (let i = 0; i < N; i++) {
    const t0 = performance.now();
    const cases = await db.clinicalScreeningInfo.findMany({
      where: { currentSupervisorId: supervisorId },
      include,
    });
    times.push(performance.now() - t0);
    if (i === 0) {
      rows = cases.length;
      noteRows = cases.reduce((n, c) => n + (c as { clinicalCaseNotes: unknown[] }).clinicalCaseNotes.length, 0);
      bytes = Buffer.byteLength(JSON.stringify(cases));
    }
  }
  times.sort((a, b) => a - b);
  const p = (q: number) => times[Math.floor(q * (N - 1))]!.toFixed(2);
  console.log(`${label}: cases=${rows} noteRows=${noteRows} bytes=${bytes} p50=${p(0.5)}ms p95=${p(0.95)}ms`);
  return { label, rows, noteRows, bytes, p50: p(0.5), p95: p(0.95) };
}

const before = await run("before (all notes)", { ...baseInclude, clinicalCaseNotes: true });
const after = await run("after  (latest riskLevel)", {
  ...baseInclude,
  clinicalCaseNotes: { orderBy: { createdAt: "desc" }, take: 1, select: { riskLevel: true } },
});
console.log(JSON.stringify({ before, after }));
await db.$disconnect();
