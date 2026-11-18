import { useState } from "react";
import { useFetcher } from "react-router";
import { Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { describeNoteDraft, type NoteDraft } from "~/modules/note-draft";
import { cn, formatRelativeTime } from "~/lib/utils";

type SavedNote = { body: string; updatedAt: string };

const HEADING_ID = "lesson-note-heading";

/** A Student's private Note on a Lesson, saved with the button or Ctrl/⌘+Enter. */
export function LessonNote({ note }: { note: SavedNote | null }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [text, setText] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const draft = describeNoteDraft(text, note?.body ?? "");

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mb-8 overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30"
    >
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="save-note" />
        <NoteHeader status={statusLabel(draft, note, isSaving)} />
        <textarea
          name="body"
          aria-labelledby={HEADING_ID}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              if (draft.canSave) event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Jot down what you want to remember from this lesson…"
          className="block field-sizing-content max-h-96 min-h-24 w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <NoteFooter
          draft={draft}
          error={fetcher.data?.error}
          isSaving={isSaving}
        />
      </fetcher.Form>
    </section>
  );
}

function statusLabel(
  draft: NoteDraft,
  note: SavedNote | null,
  isSaving: boolean
): string | null {
  if (isSaving) return "Saving…";
  if (draft.status === "unsaved") return "Unsaved changes";
  if (draft.status === "saved" && note)
    return `Saved ${formatRelativeTime(note.updatedAt)}`;
  return null;
}

function NoteHeader({ status }: { status: string | null }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-4 text-muted-foreground" />
        <h2 id={HEADING_ID} className="text-sm font-semibold">
          Your notes
        </h2>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3" />
          Private
        </span>
      </div>
      <span
        suppressHydrationWarning
        aria-live="polite"
        className="text-xs text-muted-foreground"
      >
        {status}
      </span>
    </header>
  );
}

function NoteFooter({
  draft,
  error,
  isSaving,
}: {
  draft: NoteDraft;
  error: string | undefined;
  isSaving: boolean;
}) {
  return (
    <footer className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-2">
      {error ? (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : (
        <span
          className={cn(
            "text-xs tabular-nums text-muted-foreground",
            draft.nearLimit && "text-amber-600",
            draft.status === "too-long" && "text-red-600"
          )}
        >
          {draft.characterCount}
        </span>
      )}
      <div className="flex items-center gap-3">
        <kbd className="hidden font-sans text-xs text-muted-foreground sm:inline">
          Ctrl/⌘ + Enter
        </kbd>
        <Button type="submit" size="sm" disabled={isSaving || !draft.canSave}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </footer>
  );
}
