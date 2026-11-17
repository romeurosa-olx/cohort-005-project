import { and, desc, eq } from "drizzle-orm";
import { courses, lessons, modules, notes } from "~/db/schema";
import type { Db } from "~/lib/comments.server";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

// ─── Notes ───
// A Student's own writing about a Lesson, private to the Student who wrote it.
// One per Student per Lesson, held by the unique index on (user_id, lesson_id).
// See GLOSSARY.md.
//
// Only the owning Student's Lesson page and Saved page may read Note bodies.
// Nothing here takes a second user id, and nothing should.
//
// Every function takes the database first, so tests can hand in an in-memory
// one. Content access is the caller's job: the Lesson action checks it before
// calling in here.

export type NoteView = { body: string; updatedAt: string };

export function getNote(
  db: Db,
  userId: number,
  lessonId: number
): NoteView | null {
  return (
    db
      .select({ body: notes.body, updatedAt: notes.updatedAt })
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.lessonId, lessonId)))
      .get() ?? null
  );
}

export type SaveNoteResult =
  | { ok: true; note: NoteView | null }
  | { ok: false; error: string };

/**
 * Stores the Student's Note on a Lesson. The body is trimmed. Saving again
 * replaces the body and moves `updatedAt` on; `createdAt` stays. A body over
 * MAX_NOTE_LENGTH is refused, not truncated. An empty body removes the Note,
 * so clearing the box and saving leaves the Student with no Note.
 */
export function saveNote(
  db: Db,
  userId: number,
  lessonId: number,
  body: string,
  now: Date
): SaveNoteResult {
  const trimmed = body.trim();
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `A note can be at most ${MAX_NOTE_LENGTH} characters.`,
    };
  }

  if (trimmed.length === 0) {
    db.delete(notes)
      .where(and(eq(notes.userId, userId), eq(notes.lessonId, lessonId)))
      .run();
    return { ok: true, note: null };
  }

  const timestamp = now.toISOString();
  const note = db
    .insert(notes)
    .values({
      userId,
      lessonId,
      body: trimmed,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [notes.userId, notes.lessonId],
      set: { body: trimmed, updatedAt: timestamp },
    })
    .returning({ body: notes.body, updatedAt: notes.updatedAt })
    .get();
  return { ok: true, note };
}

/** The Student's Notes, last edited first, each with its Lesson and Course. */
export function listNotes(db: Db, userId: number) {
  return db
    .select({
      id: notes.id,
      body: notes.body,
      updatedAt: notes.updatedAt,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      moduleTitle: modules.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(notes)
    .innerJoin(lessons, eq(notes.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt), desc(notes.id))
    .all();
}
