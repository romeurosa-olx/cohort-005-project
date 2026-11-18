import { describe } from "./lib/describe";

export type { NoteDraft, NoteDraftStatus } from "./lib/describe";

/**
 * What the lesson's note editor should show for the text in the box, given
 * the body last saved: whether it is saved, whether Save is offered, and the
 * character counter.
 */
export function describeNoteDraft(draft: string, savedBody: string) {
  return describe(draft, savedBody);
}
