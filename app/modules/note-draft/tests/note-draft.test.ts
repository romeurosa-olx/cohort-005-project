import { describe, expect, it } from "vitest";
import { describeNoteDraft } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("describeNoteDraft", () => {
  it("is empty, with nothing to save, when there is no note and no text", () => {
    expect(describeNoteDraft("", "")).toEqual({
      status: "empty",
      canSave: false,
      characterCount: "0 / 2,000",
      nearLimit: false,
    });
  });

  it("offers Save once the Student types", () => {
    const draft = describeNoteDraft("Narrowing", "");
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
    expect(draft.characterCount).toBe("9 / 2,000");
  });

  it("is saved when the text matches the stored note", () => {
    const draft = describeNoteDraft("Narrowing", "Narrowing");
    expect(draft.status).toBe("saved");
    expect(draft.canSave).toBe(false);
  });

  it("ignores surrounding whitespace, as the save action trims it", () => {
    const draft = describeNoteDraft("  Narrowing\n", "Narrowing");
    expect(draft.status).toBe("saved");
    expect(draft.characterCount).toBe("9 / 2,000");
  });

  it("does not offer Save for blank text, which the action rejects", () => {
    const draft = describeNoteDraft("   ", "Narrowing");
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(false);
  });

  it("allows a note of exactly the maximum length", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), "");
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
  });

  it("refuses a note over the maximum length", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), "");
    expect(draft.status).toBe("too-long");
    expect(draft.canSave).toBe(false);
    expect(draft.characterCount).toBe("2,001 / 2,000");
  });

  it("warns from 200 characters before the limit, not before", () => {
    expect(
      describeNoteDraft("a".repeat(MAX_NOTE_LENGTH - 201), "").nearLimit
    ).toBe(false);
    expect(
      describeNoteDraft("a".repeat(MAX_NOTE_LENGTH - 200), "").nearLimit
    ).toBe(true);
  });
});
