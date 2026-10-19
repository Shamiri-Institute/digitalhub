// The survey builder's editing state: the draft form being edited and what the editor needs around
// it. Every change is a pure step of `builderReducer`, so moves and edits are tested without a
// browser. Ids for new items are made by the caller (`newItem`), which keeps the reducer pure.

import { objectId } from "#/lib/crypto";
import {
  type ItemKind,
  isQuestion,
  KEY_MAX_LENGTH,
  type SurveyForm,
  type SurveyItem,
  type SurveyPage,
} from "#/lib/survey/form";

/** A page by its position, or an item by its id. */
export type Selection = { page: number } | { item: string } | null;

export type BuilderState = {
  form: SurveyForm;
  /** The form as last saved. Unsaved changes are the difference, never a separate flag. */
  savedForm: SurveyForm;
  revision: number;
  selection: Selection;
  /** Questions added in this editor whose key still follows their prompt. Never saved. */
  keyFollowsPrompt: ReadonlySet<string>;
  /** Off until the first Save, so a question being typed isn't marked wrong. */
  showIssues: boolean;
};

export type BuilderAction =
  | { type: "addPage" }
  | { type: "renamePage"; page: number; title: string }
  | { type: "movePage"; page: number; by: -1 | 1 }
  | { type: "deletePage"; page: number }
  | { type: "addItem"; page: number; item: SurveyItem }
  /** Every edit of an item's settings replaces the whole item. */
  | { type: "replaceItem"; item: SurveyItem }
  /** Past the first or last item of a page, an item moves on to the end of the page before it or
   * the start of the page after it. */
  | { type: "moveItem"; itemId: string; by: -1 | 1 }
  | { type: "moveItemToPage"; itemId: string; page: number }
  | { type: "deleteItem"; itemId: string }
  | { type: "select"; selection: Selection }
  /** A blocked Save: show every issue and select the first item with one. */
  | { type: "showIssues"; itemId?: string }
  /** `form` is the form that was sent, so changes made while it was saving stay unsaved. */
  | { type: "saved"; revision: number; form: SurveyForm };

export function initBuilder({
  form,
  revision,
}: {
  form: SurveyForm;
  revision: number;
}): BuilderState {
  const firstItem = form.pages[0]?.items[0];
  return {
    form,
    savedForm: form,
    revision,
    selection: firstItem ? { item: firstItem.id } : form.pages.length > 0 ? { page: 0 } : null,
    keyFollowsPrompt: new Set<string>(),
    showIssues: false,
  };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "addPage": {
      const pages = [...state.form.pages, { items: [] }];
      return { ...withPages(state, pages), selection: { page: pages.length - 1 } };
    }
    case "renamePage":
      return withPages(
        state,
        state.form.pages.map((page, index) =>
          index === action.page ? { ...page, title: action.title || undefined } : page,
        ),
      );
    case "movePage": {
      const target = action.page + action.by;
      if (target < 0 || target >= state.form.pages.length) {
        return state;
      }
      const next = withPages(state, swap(state.form.pages, action.page, target));
      const selected = state.selection;
      return selected && "page" in selected && selected.page === action.page
        ? { ...next, selection: { page: target } }
        : next;
    }
    case "deletePage": {
      // A page goes only once it is empty, so no question is lost by one click.
      if (state.form.pages[action.page]?.items.length !== 0) {
        return state;
      }
      return {
        ...withPages(
          state,
          state.form.pages.filter((_, index) => index !== action.page),
        ),
        selection: null,
      };
    }
    case "addItem": {
      const selected = state.selection;
      const pages = state.form.pages.map((page, index) => {
        if (index !== action.page) {
          return page;
        }
        const after =
          selected && "item" in selected ? page.items.findIndex((i) => i.id === selected.item) : -1;
        const at = after === -1 ? page.items.length : after + 1;
        return { ...page, items: page.items.toSpliced(at, 0, action.item) };
      });
      const keyFollowsPrompt = isQuestion(action.item)
        ? new Set([...state.keyFollowsPrompt, action.item.id])
        : state.keyFollowsPrompt;
      return {
        ...withPages(state, pages),
        selection: { item: action.item.id },
        keyFollowsPrompt,
      };
    }
    case "replaceItem":
      return replaceItem(state, action.item);
    case "moveItem":
      return moveItem(state, action.itemId, action.by);
    case "moveItemToPage": {
      const item = findItem(state.form, action.itemId);
      if (!item || !state.form.pages[action.page]) {
        return state;
      }
      const pages = withoutItem(state.form.pages, action.itemId).map((page, index) =>
        index === action.page ? { ...page, items: [...page.items, item] } : page,
      );
      return withPages(state, pages);
    }
    case "deleteItem":
      return {
        ...withPages(state, withoutItem(state.form.pages, action.itemId)),
        selection: null,
      };
    case "select":
      return { ...state, selection: action.selection };
    case "showIssues":
      return {
        ...state,
        showIssues: true,
        selection: action.itemId ? { item: action.itemId } : state.selection,
      };
    case "saved":
      return { ...state, savedForm: action.form, revision: action.revision };
  }
}

/** Whether the form differs from the one last saved. Forms are small, so a JSON compare is fine. */
export function hasUnsavedChanges(state: BuilderState) {
  return (
    state.form !== state.savedForm && JSON.stringify(state.form) !== JSON.stringify(state.savedForm)
  );
}

export function findItem(form: SurveyForm, itemId: string) {
  return form.pages.flatMap((page) => page.items).find((item) => item.id === itemId);
}

/** The position of the page holding an item, or -1. */
export function pageOf(form: SurveyForm, itemId: string) {
  return form.pages.findIndex((page) => page.items.some((item) => item.id === itemId));
}

/** A blank item of a kind, with a fresh id; a question gets a key not yet used in the form. */
export function newItem(kind: ItemKind, form: SurveyForm): SurveyItem {
  const id = objectId("item");
  const base = { id, prompt: "", required: false };
  const key = () => uniqueKey("question", takenKeys(form));
  const scale = [
    { code: "1", label: "Option 1" },
    { code: "2", label: "Option 2" },
  ];
  switch (kind) {
    case "heading":
    case "paragraph":
      return { id, kind, text: "" };
    case "divider":
      return { id, kind };
    case "single_choice":
    case "multiple_choice":
      return { ...base, kind, key: key(), options: scale };
    case "grid":
      return { ...base, kind, key: key(), options: scale, rows: [{ key: "1", label: "" }] };
    case "number":
      return { ...base, kind, key: key(), digits: 2 };
    case "text":
      return { ...base, kind, key: key(), lines: 3 };
    case "date":
    case "signature":
      return { ...base, kind, key: key() };
  }
}

/**
 * A key made from a prompt: lowercase words joined by `_`, starting with a letter, numbered when
 * the form already has it (`age_2`). Null for a prompt with no letters or digits.
 */
export function suggestKey(prompt: string, taken: ReadonlySet<string>) {
  const slug = prompt
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    // Room for a `_99` suffix within the length limit.
    .slice(0, KEY_MAX_LENGTH - 4)
    .replace(/_+$/, "");
  if (!slug) {
    return null;
  }
  return uniqueKey(/^[a-z]/.test(slug) ? slug : `q_${slug}`, taken);
}

function uniqueKey(base: string, taken: ReadonlySet<string>) {
  if (!taken.has(base)) {
    return base;
  }
  let n = 2;
  while (taken.has(`${base}_${n}`)) {
    n++;
  }
  return `${base}_${n}`;
}

function takenKeys(form: SurveyForm, exceptId?: string) {
  return new Set(
    form.pages
      .flatMap((page) => page.items)
      .filter(isQuestion)
      .filter((q) => q.id !== exceptId)
      .map((q) => q.key),
  );
}

/**
 * A new question's key follows its prompt until someone types in the key field: when the key
 * arrives unchanged and the prompt changed, the key is suggested again.
 */
function replaceItem(state: BuilderState, item: SurveyItem): BuilderState {
  const current = findItem(state.form, item.id);
  if (!current) {
    return state;
  }
  let next = item;
  let keyFollowsPrompt = state.keyFollowsPrompt;
  if (isQuestion(item) && isQuestion(current) && keyFollowsPrompt.has(item.id)) {
    if (item.key !== current.key) {
      keyFollowsPrompt = new Set([...keyFollowsPrompt].filter((id) => id !== item.id));
    } else if (item.prompt !== current.prompt) {
      const key = suggestKey(item.prompt, takenKeys(state.form, item.id));
      next = key ? { ...item, key } : item;
    }
  }
  const pages = state.form.pages.map((page) => ({
    ...page,
    items: page.items.map((i) => (i.id === item.id ? next : i)),
  }));
  return { ...withPages(state, pages), keyFollowsPrompt };
}

function moveItem(state: BuilderState, itemId: string, by: -1 | 1): BuilderState {
  const pageIndex = pageOf(state.form, itemId);
  const page = state.form.pages[pageIndex];
  if (!page) {
    return state;
  }
  const index = page.items.findIndex((i) => i.id === itemId);
  const target = index + by;
  if (target >= 0 && target < page.items.length) {
    const pages = state.form.pages.map((p, i) =>
      i === pageIndex ? { ...p, items: swap(p.items, index, target) } : p,
    );
    return withPages(state, pages);
  }
  const neighbour = pageIndex + by;
  const item = page.items[index];
  if (!item || neighbour < 0 || neighbour >= state.form.pages.length) {
    return state;
  }
  const pages = withoutItem(state.form.pages, itemId).map((p, i) => {
    if (i !== neighbour) {
      return p;
    }
    return { ...p, items: by === -1 ? [...p.items, item] : [item, ...p.items] };
  });
  return withPages(state, pages);
}

function withPages(state: BuilderState, pages: SurveyPage[]): BuilderState {
  return { ...state, form: { ...state.form, pages } };
}

function withoutItem(pages: SurveyPage[], itemId: string) {
  return pages.map((page) => ({ ...page, items: page.items.filter((i) => i.id !== itemId) }));
}

function swap<T>(list: T[], a: number, b: number) {
  const next = [...list];
  const first = next[a];
  const second = next[b];
  if (first === undefined || second === undefined) {
    return list;
  }
  next[a] = second;
  next[b] = first;
  return next;
}
