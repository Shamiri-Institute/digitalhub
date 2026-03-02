let supervisorIds: ReadonlySet<string> | null = null;

function getFidelityAbTestSupervisorIds(): ReadonlySet<string> {
  if (supervisorIds) return supervisorIds;

  const raw = process.env.FIDELITY_AB_TEST_SUPERVISOR_IDS ?? "";
  supervisorIds = new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  return supervisorIds;
}

export function isSupervisorInFidelityAbTest(supervisorId: string): boolean {
  return getFidelityAbTestSupervisorIds().has(supervisorId);
}
