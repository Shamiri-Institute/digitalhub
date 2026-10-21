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

/** Ctrl+B, or Cmd+B on a Mac, in a text field does what its bold button does. */
export function boldOnShortcut(event: KeyboardEvent<TextField>) {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "b") {
    event.preventDefault();
    toggleBoldIn(event.currentTarget);
  }
}

/**
 * Bolds or un-bolds the field's selection. The change goes in as typing would, through the
 * browser's insertText command, so the field's undo history keeps it and React sees an ordinary
 * input event. Only the span that changed is replaced.
 */
function toggleBoldIn(field: TextField) {
  const { value } = field;
  const next = toggleBold(
    value,
    field.selectionStart ?? value.length,
    field.selectionEnd ?? value.length,
  );
  if (next.value === value) {
    return;
  }
  let from = 0;
  while (from < value.length && value[from] === next.value[from]) from++;
  let tail = 0;
  while (
    tail < value.length - from &&
    tail < next.value.length - from &&
    value[value.length - 1 - tail] === next.value[next.value.length - 1 - tail]
  ) {
    tail++;
  }
  field.focus();
  const to = value.length - tail;
  const inserted = next.value.slice(from, next.value.length - tail);
  field.setSelectionRange(from, to);
  // oxlint-disable-next-line typescript/no-deprecated -- still the only way to edit a field and keep its undo history
  if (!document.execCommand(inserted ? "insertText" : "delete", false, inserted)) {
    // Where the command isn't supported, edit the text directly, without undo. React's value
    // tracker doesn't see setRangeText, so the input event reaches onChange.
    field.setRangeText(inserted, from, to);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
  field.setSelectionRange(next.start, next.end);
}
