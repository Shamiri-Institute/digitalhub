"use client";

import { Bold } from "lucide-react";
import type { KeyboardEvent } from "react";

import { toggleBold } from "#/lib/survey/rich-text";
import IconButton from "./icon-button";

type TextField = HTMLInputElement | HTMLTextAreaElement;

interface BoldButtonProps {
  /** The id of the text field it formats. */
  fieldId: string;
}

/** Bolds the selected words of a text field by wrapping them in `**`, or un-bolds them. */
export default function BoldButton({ fieldId }: BoldButtonProps) {
  const handleClick = () => {
    const field = document.getElementById(fieldId);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      toggleBoldIn(field);
    }
  };

  return (
    <IconButton
      label="Bold the selected words"
      // As tall as the label beside it, so fields side by side stay aligned, and no lower than the
      // gap above the field.
      className="-mb-1.5 -mt-2 h-7 w-7"
      // Keeps the selection in the field when the button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
    >
      <Bold className="h-4 w-4" />
    </IconButton>
  );
}

/** Whether the browser runs on Apple's systems, where Cmd rather than Ctrl takes shortcuts. */
function onApple() {
  return /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/**
 * Cmd+B on a Mac, Ctrl+B elsewhere, in a text field does what its bold button does. On a Mac
 * Ctrl+B keeps its own meaning, a step back. It reads the physical key, so it works on any
 * keyboard layout, and a held key toggles once.
 */
export function boldOnShortcut(event: KeyboardEvent<TextField>) {
  const command = onApple() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!command || event.altKey || event.shiftKey || event.code !== "KeyB") {
    return;
  }
  // A held key still keeps the browser's own Ctrl+B (bookmarks, in some) from opening.
  event.preventDefault();
  if (!event.repeat) {
    toggleBoldIn(event.currentTarget);
  }
}

/**
 * Bolds or un-bolds the field's selection. The edit goes in as typing would, through the
 * browser's insertText command, so the field's undo history keeps it and React sees an ordinary
 * input event.
 */
export function toggleBoldIn(field: TextField) {
  const { value } = field;
  const edit = toggleBold(
    value,
    field.selectionStart ?? value.length,
    field.selectionEnd ?? value.length,
  );
  if (!edit) {
    return;
  }
  field.focus();
  field.setSelectionRange(edit.from, edit.to);
  const command = edit.insert ? "insertText" : "delete";
  const done =
    "execCommand" in document &&
    // oxlint-disable-next-line typescript/no-deprecated -- still the only way to edit a field and keep its undo history
    document.execCommand(command, false, edit.insert);
  if (!done) {
    // Where the command isn't supported, edit the text directly, without undo. React's value
    // tracker doesn't see setRangeText, so the input event reaches onChange.
    field.setRangeText(edit.insert, edit.from, edit.to);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
  field.setSelectionRange(edit.start, edit.end);
}
