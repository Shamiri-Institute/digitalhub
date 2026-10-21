"use client";

import { Bold } from "lucide-react";

import { toggleBold } from "#/lib/survey/rich-text";
import IconButton from "./icon-button";

interface BoldButtonProps {
  /** The id of the text field it formats. */
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
}

/** Bolds the selected words of a text field by wrapping them in `**`, or un-bolds them. */
export default function BoldButton({ fieldId, value, onChange }: BoldButtonProps) {
  const handleClick = () => {
    const field = document.getElementById(fieldId);
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
      return;
    }
    const next = toggleBold(
      value,
      field.selectionStart ?? value.length,
      field.selectionEnd ?? value.length,
    );
    onChange(next.value);
    // After React writes the new value, put the selection back on the same words.
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.start, next.end);
    });
  };

  return (
    <IconButton
      label="Bold the selected words"
      className="-my-2 h-7 w-7"
      // Keeps the selection in the field when the button is pressed. The negative margin keeps the
      // label row as tall as a plain label, so fields side by side stay aligned.
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
    >
      <Bold className="h-4 w-4" />
    </IconButton>
  );
}
