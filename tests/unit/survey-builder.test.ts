import { describe, expect, it } from "vitest";

import { builderReducer, currentPage, initBuilder, newItemId } from "#/lib/survey/builder";
import { checkForm, lockedQuestions } from "#/lib/survey/check-form";
import type { SurveyForm } from "#/lib/survey/form";

const FORM: SurveyForm = {
  format: 1,
  pages: [
    {
      title: "About you",
      items: [
        { id: "intro", kind: "heading", text: "About you" },
        { id: "age", kind: "number", key: "age", prompt: "Age", required: true, digits: 2 },
      ],
    },
    {
      items: [
        {
          id: "mood",
          kind: "single_choice",
          key: "mood",
          prompt: "Mood",
          required: false,
          options: [
            { code: "1", label: "Low" },
            { code: "2", label: "High" },
          ],
          review: { verifyAlways: true },
        },
      ],
    },
  ],
};

type BuilderState = ReturnType<typeof initBuilder>;

const start = (publishedKeys: string[] = []) =>
  initBuilder({ form: FORM, revision: 3, publishedKeys });
const ids = (state: BuilderState) => state.form.pages.map((page) => page.items.map((i) => i.id));
const findItem = (form: SurveyForm, itemId: string) =>
  form.pages.flatMap((page) => page.items).find((item) => item.id === itemId);

/** The key a new text question gets once its prompt is typed. */
function keyFor(prompt: string, publishedKeys: string[] = []) {
  const id = newItemId();
  const added = builderReducer(start(publishedKeys), {
    type: "addItem",
    page: 0,
    kind: "text",
    id,
  });
  const item = findItem(added.form, id);
  if (item?.kind !== "text") throw new Error("missing");
  const typed = builderReducer(added, { type: "replaceItem", item: { ...item, prompt } });
  const result = findItem(typed.form, id);
  return result?.kind === "text" ? result.key : undefined;
}

describe("builderReducer", () => {
  it("moves an item past the end of its page onto the next page, unchanged", () => {
    const state = builderReducer(start(), { type: "moveItem", itemId: "age", by: 1 });
    expect(ids(state)).toEqual([["intro"], ["age", "mood"]]);
    expect(findItem(state.form, "age")).toEqual(FORM.pages[0]?.items[1]);
  });

  it("moves an item to another page with its key and settings", () => {
    const state = builderReducer(start(), { type: "moveItemToPage", itemId: "mood", page: 0 });
    expect(ids(state)).toEqual([["intro", "age", "mood"], []]);
    expect(findItem(state.form, "mood")).toEqual(FORM.pages[1]?.items[0]);
  });

  it("ignores a move past the first item of the form", () => {
    const before = start();
    expect(builderReducer(before, { type: "moveItem", itemId: "intro", by: -1 })).toBe(before);
  });

  it("keeps the selected page selected when it moves or another moves past it", () => {
    const selected = builderReducer(start(), { type: "select", selection: { page: 0 } });
    const moved = builderReducer(selected, { type: "movePage", page: 0, by: 1 });
    expect(moved.selection).toEqual({ page: 1 });
    expect(moved.form.pages[1]?.title).toBe("About you");

    const passed = builderReducer(selected, { type: "movePage", page: 1, by: -1 });
    expect(passed.selection).toEqual({ page: 1 });
    expect(passed.form.pages[1]?.title).toBe("About you");
  });

  it("deletes only an empty page", () => {
    const before = start();
    expect(builderReducer(before, { type: "deletePage", page: 1 })).toBe(before);
    const emptied = builderReducer(before, { type: "deleteItem", itemId: "mood" });
    expect(builderReducer(emptied, { type: "deletePage", page: 1 }).form.pages).toHaveLength(1);
  });

  it("stays on the page of a deleted item, and on the page before a deleted page", () => {
    const emptied = builderReducer(start(), { type: "deleteItem", itemId: "mood" });
    expect(emptied.selection).toEqual({ page: 1 });
    expect(currentPage(emptied.form, emptied.selection)).toBe(1);

    const deleted = builderReducer(emptied, { type: "deletePage", page: 1 });
    expect(deleted.selection).toEqual({ page: 0 });
  });

  it("shows the selected item's page, else the selected page, else the first", () => {
    const state = start();
    expect(currentPage(state.form, { item: "mood" })).toBe(1);
    expect(currentPage(state.form, { page: 1 })).toBe(1);
    expect(currentPage(state.form, null)).toBe(0);
    expect(currentPage({ format: 1, pages: [] }, null)).toBe(-1);
  });

  it("adds an item after the selected one and selects it", () => {
    const selected = builderReducer(start(), { type: "select", selection: { item: "intro" } });
    const id = newItemId();
    const state = builderReducer(selected, { type: "addItem", page: 0, kind: "date", id });
    expect(ids(state)[0]).toEqual(["intro", id, "age"]);
    expect(state.selection).toEqual({ item: id });
    expect(findItem(state.form, id)).toMatchObject({ kind: "date", key: "question" });
  });

  it("never suggests a key a published version used", () => {
    const id = newItemId();
    let state = builderReducer(start(["question", "energy"]), {
      type: "addItem",
      page: 0,
      kind: "text",
      id,
    });
    expect(findItem(state.form, id)).toMatchObject({ key: "question_2" });
    const item = findItem(state.form, id);
    if (item?.kind !== "text") throw new Error("missing");
    state = builderReducer(state, { type: "replaceItem", item: { ...item, prompt: "Energy" } });
    expect(findItem(state.form, id)).toMatchObject({ key: "energy_2" });
  });

  it("lets a new question's key follow its prompt until the key is typed", () => {
    const item = { id: newItemId() };
    let state = builderReducer(start(), { type: "addItem", page: 1, kind: "text", id: item.id });
    const edit = (change: { prompt?: string; key?: string }) => {
      const current = findItem(state.form, item.id);
      if (current?.kind !== "text") throw new Error("missing");
      state = builderReducer(state, { type: "replaceItem", item: { ...current, ...change } });
      return findItem(state.form, item.id);
    };

    expect(edit({ prompt: "How old are you?" })).toMatchObject({ key: "how_old_are_you" });
    expect(edit({ prompt: "Mood" })).toMatchObject({ key: "mood_2" });
    expect(edit({ key: "feeling" })).toMatchObject({ key: "feeling" });
    expect(edit({ prompt: "Something else" })).toMatchObject({ key: "feeling" });
  });

  it("never re-suggests the key of a question it loaded", () => {
    const age = findItem(FORM, "age");
    if (age?.kind !== "number") throw new Error("missing");
    const state = builderReducer(start(), {
      type: "replaceItem",
      item: { ...age, prompt: "Your age in years" },
    });
    expect(findItem(state.form, "age")).toMatchObject({ key: "age" });
  });

  it("keeps changes made while a save was in flight unsaved", () => {
    const sent = builderReducer(start(), { type: "renamePage", page: 1, title: "Mood" });
    const later = builderReducer(sent, { type: "renamePage", page: 1, title: "Feelings" });
    const saved = builderReducer(later, { type: "saved", revision: 4, form: sent.form });
    expect(saved.revision).toBe(4);
    expect(saved.savedForm).toBe(sent.form);
    expect(saved.form.pages[1]?.title).toBe("Feelings");
  });

  it("remembers a save whose reply was lost until a save is confirmed", () => {
    const lost = builderReducer(start(), { type: "saveUnconfirmed", form: FORM });
    expect(lost.unconfirmed).toBe(FORM);
    expect(builderReducer(lost, { type: "saved", revision: 5, form: FORM }).unconfirmed).toBeNull();
  });
});

describe("initBuilder", () => {
  const openAt = (pageNumber: string | null | undefined) =>
    initBuilder({ form: FORM, revision: 3, publishedKeys: [], pageNumber }).selection;

  it("opens the page the URL names, with every item closed", () => {
    expect(openAt("1")).toEqual({ page: 0 });
    expect(openAt("2")).toEqual({ page: 1 });
    expect(start().selection).toEqual({ page: 0 });
  });

  it("opens the first page for a missing, malformed or out of range number", () => {
    for (const pageNumber of [null, undefined, "", "0", "3", "-1", "1.5", "2abc", " 2"]) {
      expect(openAt(pageNumber)).toEqual({ page: 0 });
    }
  });

  it("selects nothing in a form with no pages", () => {
    const empty: SurveyForm = { format: 1, pages: [] };
    expect(
      initBuilder({ form: empty, revision: 1, publishedKeys: [], pageNumber: "1" }).selection,
    ).toBeNull();
  });
});

describe("a new question's key", () => {
  it("is made from its prompt", () => {
    expect(keyFor("  Café visits per week? ")).toBe("cafe_visits_per_week");
    expect(keyFor("2nd language")).toBe("q_2nd_language");
    expect(keyFor("?!")).toBe("question");
    expect(keyFor("Age", ["age_2"])).toBe("age_3");
  });

  it("stays within 64 characters, prefix and number included", () => {
    const long = `9${"x".repeat(80)}`;
    const first = keyFor(long);
    expect(first).toHaveLength(64);
    expect(first).toMatch(/^q_9x+$/);
    const second = keyFor(long, [first ?? ""]);
    expect(second).toHaveLength(64);
    expect(second).toMatch(/_2$/);
  });
});

describe("checkForm", () => {
  it("accepts a valid form", () => {
    expect(checkForm(FORM, []).success).toBe(true);
  });

  it("puts each problem on its item and field", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [
        {
          items: [
            { id: "a", kind: "date", key: "when", prompt: "", required: false },
            { id: "b", kind: "date", key: "when", prompt: "", required: false },
            {
              id: "c",
              kind: "grid",
              key: "phq",
              prompt: "",
              required: false,
              options: [
                { code: "0", label: "" },
                { code: "0", label: "" },
              ],
              rows: [
                { key: "1", label: "" },
                { key: "1", label: "" },
              ],
            },
            { id: "d", kind: "text", key: "Bad Key", prompt: "", required: false, lines: 2 },
          ],
        },
      ],
    };
    const check = checkForm(form, []);
    expect(check.success).toBe(false);
    expect(check.issues).toEqual(
      expect.arrayContaining([
        { itemId: "d", field: "key", message: expect.stringContaining("lowercase") },
      ]),
    );

    const fixed = structuredClone(form);
    const text = fixed.pages[0]?.items[3];
    if (text?.kind === "text") text.key = "notes";
    expect(checkForm(fixed, []).issues).toEqual([
      { itemId: "b", field: "key", message: "Another question already uses this key" },
      { itemId: "c", field: "options.1.code", message: "Another option already uses this code" },
      { itemId: "c", field: "rows.1.key", message: "Another row already uses this key" },
    ]);
  });

  it("keeps a published question's key and its kind", () => {
    const locked = lockedQuestions([{ versionNumber: 1, form: FORM }]);
    const renamed = structuredClone(FORM);
    const age = renamed.pages[0]?.items[1];
    if (age?.kind === "number") age.key = "age_years";
    expect(checkForm(renamed, locked).issues).toEqual([
      {
        itemId: "age",
        field: "key",
        message: "v1 was published with the key age, so it can't change",
      },
    ]);

    const reused: SurveyForm = {
      format: 1,
      pages: [{ items: [{ id: "new", kind: "date", key: "mood", prompt: "", required: false }] }],
    };
    expect(checkForm(reused, locked).issues).toEqual([
      { itemId: "new", field: "key", message: "v1 used this key for a single choice question" },
    ]);
  });

  it("keeps a published question's option codes first and in order", () => {
    const locked = lockedQuestions([{ versionNumber: 1, form: FORM }]);
    const withOptions = (options: { code: string; label: string }[]) => {
      const form = structuredClone(FORM);
      const mood = form.pages[1]?.items[0];
      if (mood?.kind === "single_choice") mood.options = options;
      return checkForm(form, locked).issues;
    };

    // Relabelling and adding after the published codes is fine.
    expect(
      withOptions([
        { code: "1", label: "Very low" },
        { code: "2", label: "Very high" },
        { code: "3", label: "Unsure" },
      ]),
    ).toEqual([]);
    // Swapping codes changes what stored answers mean.
    expect(
      withOptions([
        { code: "2", label: "Low" },
        { code: "1", label: "High" },
      ]),
    ).toEqual([
      {
        itemId: "mood",
        field: "options.0.code",
        message: "v1 published 1 here; published options keep their code and place",
      },
    ]);
    expect(withOptions([{ code: "1", label: "Low" }])).toEqual([
      { itemId: "mood", field: "options", message: "Keep v1's options 1, 2 first, in order" },
    ]);
  });

  it("names the newest version that published a key", () => {
    const locked = lockedQuestions([
      { versionNumber: 1, form: FORM },
      { versionNumber: 2, form: FORM },
    ]);
    const renamed = structuredClone(FORM);
    const age = renamed.pages[0]?.items[1];
    if (age?.kind === "number") age.key = "years";
    expect(checkForm(renamed, locked).issues[0]?.message).toMatch(/^v2 /);
  });

  it("rejects input that is not a form", () => {
    expect(checkForm({ format: 2, pages: [] }, []).success).toBe(false);
    expect(checkForm("nope", []).success).toBe(false);
  });
});
