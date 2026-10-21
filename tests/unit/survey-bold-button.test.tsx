import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import BoldButton, {
  boldOnShortcut,
} from "#/app/(platform)/admin/surveys/[surveyId]/versions/[versionNumber]/components/bold-button";

// jsdom has no working execCommand, so these run the fallback that edits the text directly.

declare global {
  // oxlint-disable-next-line no-var -- React reads this global to allow act() outside a test renderer
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Editor({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <BoldButton fieldId="prompt" />
      <textarea
        id="prompt"
        aria-label="Prompt"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={boldOnShortcut}
      />
    </>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(initial: string) {
  act(() => root.render(<Editor initial={initial} />));
  const field = container.querySelector("textarea");
  const button = container.querySelector("button");
  if (!field || !button) throw new Error("The editor did not render");
  return { field, button };
}

function press(field: HTMLTextAreaElement, init: KeyboardEventInit) {
  act(() => {
    field.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, code: "KeyB", ...init }));
  });
}

describe("the bold button without execCommand", () => {
  it("bolds the selection through onChange and keeps the words selected", () => {
    const { field, button } = render("How do you feel");
    field.setSelectionRange(4, 6);
    act(() => button.click());
    expect(field.value).toBe("How **do** you feel");
    expect([field.selectionStart, field.selectionEnd]).toEqual([6, 8]);
  });

  it("bolds on Ctrl+B once, however long the key is held", () => {
    const { field } = render("How do you feel");
    field.setSelectionRange(4, 6);
    press(field, { ctrlKey: true, key: "b" });
    press(field, { ctrlKey: true, key: "b", repeat: true });
    expect(field.value).toBe("How **do** you feel");
  });

  it("reads the physical key, whatever the layout types", () => {
    const { field } = render("How do you feel");
    field.setSelectionRange(4, 6);
    press(field, { ctrlKey: true, key: "и" });
    expect(field.value).toBe("How **do** you feel");
  });

  it("leaves Cmd+B alone off Apple systems", () => {
    const { field } = render("How do you feel");
    field.setSelectionRange(4, 6);
    press(field, { metaKey: true, key: "b" });
    expect(field.value).toBe("How do you feel");
  });
});
