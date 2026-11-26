"use client";

import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Textarea } from "#/components/ui/textarea";
import type { FieldInput } from "#/lib/survey/answer-fields";
import type { AnswerValue } from "#/lib/survey/answer-fields";
import { cn } from "#/lib/utils";

type Mark = { code: string; fill: number };

export function AnswerInput({
  input,
  marks,
  value,
  onChange,
  disabled,
}: {
  input: FieldInput;
  /** Each option's ink as the pipeline measured it. */
  marks: Mark[];
  value: AnswerValue | null;
  onChange: (value: AnswerValue | null) => void;
  disabled: boolean;
}) {
  // Any question can be blank on paper, required ones included: the page decides.
  const leaveBlankButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onChange(null)}
      disabled={disabled || value === null}
    >
      Leave blank
    </Button>
  );

  const unshown = unshownValue(input, value);
  const unshownNote = unshown && (
    <p className="rounded-md bg-red-bg px-3 py-2 text-sm text-red-base">
      Stored as <span className="font-mono">{unshown}</span>, which this question can&apos;t hold.
      Enter what the page shows instead.
    </p>
  );

  switch (input.kind) {
    case "choice": {
      const strongest = Math.max(0, ...marks.map((mark) => mark.fill));
      const inkOf = (code: string) => {
        const fill = marks.find((mark) => mark.code === code)?.fill ?? 0;
        return strongest > 0 ? fill / strongest : 0;
      };
      const options = input.options.map((option) => ({
        ...option,
        ink: inkOf(option.code),
      }));
      const chosen = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
      return (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="mb-2 text-sm font-medium text-shamiri-black">
            {input.multiple ? "Marked options" : "Marked option"}
          </legend>
          {unshownNote}
          {input.multiple ? (
            <div className="space-y-1">
              {options.map((option) => (
                <ChoiceRow key={option.code} {...option} checked={chosen.includes(option.code)}>
                  <Checkbox
                    id={`option-${option.code}`}
                    checked={chosen.includes(option.code)}
                    onCheckedChange={(checked) =>
                      onChange(
                        checked
                          ? [...chosen, option.code]
                          : chosen.filter((code) => code !== option.code),
                      )
                    }
                  />
                </ChoiceRow>
              ))}
            </div>
          ) : (
            <RadioGroup
              value={typeof value === "string" ? value : ""}
              onValueChange={onChange}
              className="gap-1"
            >
              {options.map((option) => (
                <ChoiceRow key={option.code} {...option} checked={value === option.code}>
                  <RadioGroupItem id={`option-${option.code}`} value={option.code} />
                </ChoiceRow>
              ))}
            </RadioGroup>
          )}
          {marks.length > 0 && (
            <p className="text-xs text-shamiri-text-grey">
              The bar is the ink the pipeline found on each option, against the darkest.
            </p>
          )}
          {leaveBlankButton}
        </fieldset>
      );
    }
    case "digits":
      return (
        <div className="space-y-1.5">
          <Label htmlFor="answer-value">Digits as written</Label>
          <div className="flex items-center gap-2">
            <Input
              id="answer-value"
              inputMode="numeric"
              autoComplete="off"
              maxLength={input.digits}
              value={typeof value === "string" ? value : ""}
              onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
              disabled={disabled}
              className="w-40 font-mono tabular-nums"
            />
            {leaveBlankButton}
          </div>
          <p className="text-xs text-shamiri-text-grey">
            Up to {input.digits} digits
            {input.min !== undefined || input.max !== undefined
              ? `, from ${input.min ?? "any"} to ${input.max ?? "any"}`
              : ""}
            .
          </p>
        </div>
      );
    case "date":
      return (
        <div className="space-y-1.5">
          {unshownNote}
          <Label htmlFor="answer-value">Date as written</Label>
          <div className="flex items-center gap-2">
            <Input
              id="answer-value"
              type="date"
              value={typeof value === "string" ? value : ""}
              onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
              disabled={disabled}
              className="w-48"
            />
            {leaveBlankButton}
          </div>
        </div>
      );
    case "text":
      return (
        <div className="space-y-1.5">
          <Label htmlFor="answer-value">Text as written</Label>
          <Textarea
            id="answer-value"
            rows={Math.min(input.lines, 4)}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
            disabled={disabled}
          />
          <div className="flex items-center justify-between">
            <span />
            {leaveBlankButton}
          </div>
        </div>
      );
    case "signature":
      return (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="mb-2 text-sm font-medium text-shamiri-black">Signature</legend>
          <RadioGroup
            value={value === true ? "signed" : "blank"}
            onValueChange={(choice) => onChange(choice === "signed" ? true : null)}
            className="flex gap-6"
          >
            <span className="flex items-center gap-2">
              <RadioGroupItem id="signature-signed" value="signed" />
              <Label htmlFor="signature-signed">Signed</Label>
            </span>
            <span className="flex items-center gap-2">
              <RadioGroupItem id="signature-blank" value="blank" />
              <Label htmlFor="signature-blank">Not signed</Label>
            </span>
          </RadioGroup>
        </fieldset>
      );
  }
}

function ChoiceRow({
  code,
  label,
  ink,
  checked,
  children,
}: {
  code: string;
  label: string;
  ink: number;
  checked: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr_6rem] items-center gap-3 rounded-md px-3 py-2 transition-colors",
        checked ? "bg-blue-bg" : "hover:bg-muted",
      )}
    >
      {children}
      <Label
        htmlFor={`option-${code}`}
        className="flex cursor-pointer items-baseline gap-2 font-normal"
      >
        <span className="text-shamiri-black">{label}</span>
        {code !== label && <span className="font-mono text-xs text-shamiri-text-grey">{code}</span>}
      </Label>
      <InkBar ink={ink} />
    </div>
  );
}

const INK_STEPS = [
  "w-0",
  "w-1/12",
  "w-2/12",
  "w-3/12",
  "w-4/12",
  "w-5/12",
  "w-6/12",
  "w-7/12",
  "w-8/12",
  "w-9/12",
  "w-10/12",
  "w-11/12",
  "w-full",
];

/** Ink in twelfths: the bar only has to tell a strong mark from a faint one. */
function InkBar({ ink }: { ink: number }) {
  const step = INK_STEPS[Math.round(Math.min(Math.max(ink, 0), 1) * 12)] ?? "w-0";
  return (
    <span className="h-1.5 overflow-hidden rounded-full bg-grey-border" aria-hidden>
      <span className={cn("block h-full rounded-full bg-shamiri-new-blue", step)} />
    </span>
  );
}

/**
 * A stored value the input can't display, as text: a code the form never printed, or a date that
 * doesn't exist, both of which a choice or date input would show as empty. Null when it shows.
 */
function unshownValue(input: FieldInput, value: AnswerValue | null): string | null {
  if (value === null) return null;
  if (input.kind === "choice") {
    const codes = Array.isArray(value) ? value : [String(value)];
    const unknown = codes.filter((code) => !input.options.some((option) => option.code === code));
    return unknown.length > 0 ? unknown.join(", ") : null;
  }
  if (input.kind === "date" && typeof value === "string") {
    const date = new Date(`${value}T00:00:00Z`);
    const real =
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(date.getTime()) &&
      date.toISOString().startsWith(value);
    return real ? null : value;
  }
  return null;
}
