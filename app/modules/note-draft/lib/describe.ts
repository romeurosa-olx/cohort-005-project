import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraftStatus =
  | "empty"
  | "blank"
  | "saved"
  | "unsaved"
  | "too-long";

export type NoteDraft = {
  status: NoteDraftStatus;
  canSave: boolean;
  characterCount: string;
  nearLimit: boolean;
};

/** Characters left at which the counter starts to warn. */
const NEAR_LIMIT_MARGIN = 200;

export function describe(draft: string, savedBody: string): NoteDraft {
  // The save action trims before it stores, so the draft is measured and
  // compared the same way; otherwise a trailing newline reads as unsaved.
  const body = draft.trim();
  const status = statusOf(body, savedBody);

  return {
    status,
    canSave: status === "unsaved",
    characterCount: `${body.length.toLocaleString("en")} / ${MAX_NOTE_LENGTH.toLocaleString("en")}`,
    nearLimit: MAX_NOTE_LENGTH - body.length <= NEAR_LIMIT_MARGIN,
  };
}

// The action rejects blank text, so clearing a saved note is "blank", not a
// change Save can store.
function statusOf(body: string, savedBody: string): NoteDraftStatus {
  if (body.length > MAX_NOTE_LENGTH) return "too-long";
  if (body === "") return savedBody === "" ? "empty" : "blank";
  if (body !== savedBody) return "unsaved";
  return "saved";
}
