import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { hubCoordinator, implementerMember } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import type { ShownPerson } from "#/lib/survey/person-word";

type Person = { id: string; name: string | null; email: string | null };

/**
 * Shows each of `people` by their account name, else their hub coordinator profile's name in the
 * viewer's implementer (a coordinator's account often has none), else, to the Research team only,
 * their address. Hub coordinators never see addresses.
 */
export async function loadShownPeople(viewer: SurveyViewer, people: readonly (Person | null)[]) {
  const unnamedUserIds = [
    ...new Set(people.flatMap((person) => (person && !person.name ? [person.id] : []))),
  ];
  const coordinatorProfiles =
    unnamedUserIds.length === 0
      ? []
      : await db
          .select({ userId: implementerMember.userId, name: hubCoordinator.coordinatorName })
          .from(implementerMember)
          .innerJoin(hubCoordinator, eq(hubCoordinator.id, implementerMember.identifier))
          .where(
            and(
              eq(implementerMember.implementerId, viewer.implementerId),
              eq(implementerMember.role, ImplementerRole.HUB_COORDINATOR),
              inArray(implementerMember.userId, unnamedUserIds),
            ),
          )
          .orderBy(asc(implementerMember.id));
  const coordinatorNameByUser = new Map<string, string>();
  for (const { userId, name } of coordinatorProfiles) {
    if (!coordinatorNameByUser.has(userId)) coordinatorNameByUser.set(userId, name);
  }
  return (person: Person | null): ShownPerson => {
    if (!person) return { name: null, isViewer: false };
    const name =
      person.name ||
      coordinatorNameByUser.get(person.id) ||
      (viewer.kind === "project" ? person.email : null);
    return { name, isViewer: person.id === viewer.userId };
  };
}
