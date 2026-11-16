import { cn } from "#/lib/utils";

// A radio choice's dot and label, drawn over the radio. Kept apart from the attendance form so
// the dialogs that only draw the dot don't load the form's code with them.
export function CustomIndicator({ className, label }: { className: string; label: string }) {
  return (
    <div className="custom-indicator pointer-events-none absolute inset-0 flex h-20 items-center pl-6">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "indicator h-4 w-4 rounded-full border border-input bg-white shadow-sm",
            className,
          )}
        />
        <span>{label}</span>
      </div>
    </div>
  );
}
