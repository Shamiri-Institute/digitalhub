let _supervisorIds: ReadonlySet<string> | null = null;

function getFidelityAbTestSupervisorIds(): ReadonlySet<string> {
  if (_supervisorIds) return _supervisorIds;

  const raw = process.env.FIDELITY_AB_TEST_SUPERVISOR_IDS ?? "";
  _supervisorIds = new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  return _supervisorIds;
}

export function isSupervisorInFidelityAbTest(supervisorId: string): boolean {
  return getFidelityAbTestSupervisorIds().has(supervisorId);
}
