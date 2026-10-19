"use client";

import { ArrowDown, ArrowUp, Lock, Plus, X } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { issueKey } from "#/lib/survey/check-form";
import { cn } from "#/lib/utils";
import IconButton from "./icon-button";

/** An option `{ code, label }`, or a grid row with its key passed as `code`. */
type Entry = { code: string; label: string };

interface EntryListEditorProps {
  itemId: string;
  /** "Option" or "Row", in labels such as "Option 2 code". */
  noun: "Option" | "Row";
  /** Where the form keeps the list and what the code is called there, for finding issues. */
  field: "options" | "rows";
  codeName: "code" | "key";
  entries: Entry[];
  onChange: (entries: Entry[]) => void;
  messages: Map<string, string>;
  editable: boolean;
  /**
   * How many leading entries a published version fixed. Answers already use their codes, so
   * they keep their code and place; only their labels change. New entries go after them.
   */
  publishedCount: number;
  /** The version that fixed them, such as "v1". */
  publishedIn?: string;
}

/** Edits an ordered list of codes and labels: a question's options or a grid's rows. */
export default function EntryListEditor({
  itemId,
  noun,
  field,
  codeName,
  entries,
  onChange,
  messages,
  editable,
  publishedCount,
  publishedIn,
}: EntryListEditorProps) {
  const lower = noun.toLowerCase();
  const update = (index: number, change: Partial<Entry>) =>
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...change } : entry)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...entries];
    const [entry] = next.splice(index, 1);
    if (entry) {
      next.splice(index + by, 0, entry);
      onChange(next);
    }
  };
  const add = () => onChange([...entries, { code: nextCode(entries), label: "" }]);
  const listMessage = messages.get(issueKey(itemId, field));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <Label>{noun === "Option" ? "Options" : "Rows"}</Label>
        <span className="text-right text-xs text-muted-foreground">
          {publishedCount > 0 && publishedIn
            ? `${publishedIn}'s ${codeName}s are fixed; add new ${lower}s after them`
            : noun === "Option"
              ? "Answers store the code"
              : "Each row is answered as key.row"}
        </span>
      </div>
      {entries.length === 0 && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          No {lower}s yet.
        </p>
      )}
      <ol className="space-y-2">
        {entries.map((entry, index) => {
          const position = index + 1;
          const published = index < publishedCount;
          const codeMessage = messages.get(issueKey(itemId, `${field}.${index}.${codeName}`));
          const labelMessage = messages.get(issueKey(itemId, `${field}.${index}.label`));
          return (
            // oxlint-disable-next-line react/no-array-index-key -- entries have no id and every input is controlled; a code-based key would remount the input being typed in
            <li key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="relative w-20 shrink-0">
                  <Input
                    aria-label={`${noun} ${position} ${codeName}`}
                    aria-invalid={Boolean(codeMessage)}
                    value={entry.code}
                    disabled={published}
                    onChange={(e) => update(index, { code: e.target.value })}
                    className={cn(
                      "font-mono",
                      codeMessage && "border-destructive",
                      published && "pr-7",
                    )}
                  />
                  {published && (
                    <Lock className="absolute right-2 top-2.5 h-4 w-4 text-shamiri-text-grey" />
                  )}
                </div>
                <Input
                  aria-label={`${noun} ${position} label`}
                  value={entry.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  placeholder={noun === "Option" ? "Label" : "Statement"}
                />
                {editable && (
                  <div className="flex shrink-0 items-center">
                    <IconButton
                      label={`Move ${lower} ${position} up`}
                      disabled={index === 0 || published || index === publishedCount}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={`Move ${lower} ${position} down`}
                      disabled={index === entries.length - 1 || published}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={`Remove ${lower} ${position}`}
                      disabled={published}
                      className="text-shamiri-light-red"
                      onClick={() => onChange(entries.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </IconButton>
                  </div>
                )}
              </div>
              {(codeMessage ?? labelMessage) && (
                <p className="text-xs font-medium text-destructive">
                  {codeMessage ?? labelMessage}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {listMessage && <p className="text-xs font-medium text-destructive">{listMessage}</p>}
      {editable && (
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={add}>
          <Plus className="h-4 w-4" />
          Add {lower}
        </Button>
      )}
    </div>
  );
}

/** One more than the highest numeric code, so a scale keeps counting: 1, 2, 3. */
function nextCode(entries: Entry[]) {
  const numbers = entries.map((e) => Number(e.code)).filter(Number.isInteger);
  return String(numbers.length > 0 ? Math.max(...numbers) + 1 : entries.length + 1);
}
