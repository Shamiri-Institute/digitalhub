// The rules a draft's form must meet to be saved, in one place: the builder runs them on every
// render to show messages beside the fields, and the save action runs them again as the authority.
// Rules about a finished form (no empty pages, enough options) belong to publish, so a half-built
// draft still saves.

import {
  ITEM_KIND_LABELS,
  isQuestion,
  type QuestionItem,
  type QuestionKind,
  type SurveyForm,
  SurveyFormSchema,
} from "#/lib/survey/form";

/**
 * A question as a published or retired version of the survey has it. Answers already use its key,
 * so the key keeps its meaning: the question (matched by id, which survives draft copies) keeps its
 * key, and no question asks something of another kind under it.
 */
export type LockedQuestion = { id: string; key: string; kind: QuestionKind; versionNumber: number };

/** Every question of the given published and retired versions. */
export function lockedQuestions(
  versions: { versionNumber: number; form: SurveyForm }[],
): LockedQuestion[] {
  return versions.flatMap(({ versionNumber, form }) =>
    form.pages
      .flatMap((page) => page.items)
      .filter(isQuestion)
      .map((q) => ({ id: q.id, key: q.key, kind: q.kind, versionNumber })),
  );
}

export function isLockedItem(locked: LockedQuestion[], itemId: string) {
  return locked.some((q) => q.id === itemId);
}

/**
 * One problem with the form. `itemId` and `field` say where to show it, by id rather than by
 * position, so the message stays on its field when the item moves. `field` is a property of the
 * item, or `options.<i>.code`, `rows.<i>.key` and the like for an entry of a list. Without an
 * `itemId` the problem is with the form as a whole.
 */
export type FormIssue = { itemId?: string; field: string; message: string };

export type FormCheck =
  | { success: true; form: SurveyForm; issues: [] }
  | { success: false; issues: FormIssue[] };

/** Where an issue shows, for looking it up while rendering a field. */
export function issueKey(itemId: string, field: string) {
  return `${itemId}:${field}`;
}

/** The first message for each field. */
export function indexIssues(issues: FormIssue[]) {
  const messages = new Map<string, string>();
  for (const issue of issues) {
    const key = issue.itemId ? issueKey(issue.itemId, issue.field) : issue.field;
    if (!messages.has(key)) {
      messages.set(key, issue.message);
    }
  }
  return messages;
}

/** Checks a form, typed or straight from a request. Pure. */
export function checkForm(input: unknown, locked: LockedQuestion[]): FormCheck {
  const parsed = SurveyFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => shapeIssue(input, issue.path, issue.message)),
    };
  }

  const form = parsed.data;
  const issues: FormIssue[] = [];
  const items = form.pages.flatMap((page) => page.items);
  const questions = items.filter(isQuestion);

  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      issues.push({ field: "form", message: `Two items share the id ${item.id}` });
    }
    ids.add(item.id);
  }

  const keys = new Set<string>();
  for (const question of questions) {
    if (keys.has(question.key)) {
      issues.push({
        itemId: question.id,
        field: "key",
        message: "Another question already uses this key",
      });
    }
    keys.add(question.key);
    issues.push(...entryIssues(question), ...lockIssues(question, locked));
  }

  return issues.length === 0 ? { success: true, form, issues: [] } : { success: false, issues };
}

/** Option codes and grid row keys are unique within their question; a number's range is in order. */
function entryIssues(question: QuestionItem): FormIssue[] {
  const issues: FormIssue[] = [];
  if ("options" in question) {
    issues.push(
      ...duplicates(question.options.map((o) => o.code)).map((i) => ({
        itemId: question.id,
        field: `options.${i}.code`,
        message: "Another option already uses this code",
      })),
    );
  }
  if (question.kind === "grid") {
    issues.push(
      ...duplicates(question.rows.map((r) => r.key)).map((i) => ({
        itemId: question.id,
        field: `rows.${i}.key`,
        message: "Another row already uses this key",
      })),
    );
  }
  if (
    question.kind === "number" &&
    question.min !== undefined &&
    question.max !== undefined &&
    question.min > question.max
  ) {
    issues.push({ itemId: question.id, field: "max", message: "Use a maximum above the minimum" });
  }
  return issues;
}

function lockIssues(question: QuestionItem, locked: LockedQuestion[]): FormIssue[] {
  const inherited = locked.find((q) => q.id === question.id && q.key !== question.key);
  if (inherited) {
    return [
      {
        itemId: question.id,
        field: "key",
        message: `v${inherited.versionNumber} was published with the key ${inherited.key}, so it can't change`,
      },
    ];
  }
  const otherKind = locked.find((q) => q.key === question.key && q.kind !== question.kind);
  if (otherKind) {
    return [
      {
        itemId: question.id,
        field: "key",
        message: `v${otherKind.versionNumber} used this key for a ${ITEM_KIND_LABELS[otherKind.kind].toLowerCase()} question`,
      },
    ];
  }
  return [];
}

/** The positions of values that already appeared earlier in the list. */
function duplicates(values: string[]) {
  const seen = new Set<string>();
  const repeated: number[] = [];
  values.forEach((value, index) => {
    if (seen.has(value)) {
      repeated.push(index);
    }
    seen.add(value);
  });
  return repeated;
}

/**
 * Turns a schema issue at `pages.<p>.items.<i>.<field...>` into one on that item, found by its id in
 * the input. Anything else, or an item without an id, is a problem with the form as a whole.
 */
function shapeIssue(input: unknown, path: PropertyKey[], message: string): FormIssue {
  const [pages, pageIndex, items, itemIndex, ...field] = path;
  if (pages === "pages" && items === "items" && field.length > 0) {
    const item = itemAt(input, pageIndex, itemIndex);
    if (typeof item?.id === "string") {
      return { itemId: item.id, field: field.map(String).join("."), message };
    }
  }
  return { field: "form", message: `${path.map(String).join(".") || "form"}: ${message}` };
}

function itemAt(input: unknown, pageIndex: unknown, itemIndex: unknown) {
  if (typeof pageIndex !== "number" || typeof itemIndex !== "number") {
    return null;
  }
  const page = (input as { pages?: { items?: { id?: unknown }[] }[] } | null)?.pages?.[pageIndex];
  return page?.items?.[itemIndex];
}
