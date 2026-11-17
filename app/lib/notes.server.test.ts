import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { MAX_NOTE_LENGTH } from "./notes";
import { getNote, listNotes, saveNote } from "./notes.server";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);
const LATER = new Date(2026, 9, 6, 13, 0, 0);

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

function addStudent(name: string) {
  return db
    .insert(schema.users)
    .values({
      name,
      email: `${name.toLowerCase()}@example.com`,
      role: schema.UserRole.Student,
    })
    .returning()
    .get();
}

describe("saving a Note", () => {
  it("creates the Note with the body trimmed", () => {
    const result = saveNote(db, base.user.id, lessonIds[0], "  # not a heading  ", NOW);

    expect(result).toEqual({
      ok: true,
      note: { body: "# not a heading", updatedAt: NOW.toISOString() },
    });
    expect(getNote(db, base.user.id, lessonIds[0])).toEqual({
      body: "# not a heading",
      updatedAt: NOW.toISOString(),
    });
  });

  it("has no Note on a Lesson the Student never wrote on", () => {
    expect(getNote(db, base.user.id, lessonIds[0])).toBeNull();
  });

  it("replaces the body and moves the last edited time on when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "first", NOW);
    saveNote(db, base.user.id, lessonIds[0], "second", LATER);

    expect(getNote(db, base.user.id, lessonIds[0])).toEqual({
      body: "second",
      updatedAt: LATER.toISOString(),
    });
    expect(listNotes(db, base.user.id)).toHaveLength(1);
  });

  it("keeps the created time when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "first", NOW);
    saveNote(db, base.user.id, lessonIds[0], "second", LATER);

    const row = db.select().from(schema.notes).get();
    expect(row?.createdAt).toBe(NOW.toISOString());
  });

  it("accepts a Note of exactly the maximum length", () => {
    const body = "a".repeat(MAX_NOTE_LENGTH);

    expect(saveNote(db, base.user.id, lessonIds[0], body, NOW)).toMatchObject({
      ok: true,
    });
  });

  it("refuses a Note over the maximum length and stores nothing", () => {
    const body = "a".repeat(MAX_NOTE_LENGTH + 1);

    expect(saveNote(db, base.user.id, lessonIds[0], body, NOW)).toEqual({
      ok: false,
      error: "A note can be at most 2000 characters.",
    });
    expect(getNote(db, base.user.id, lessonIds[0])).toBeNull();
  });

  it("removes the Note when saved empty", () => {
    saveNote(db, base.user.id, lessonIds[0], "first", NOW);

    expect(saveNote(db, base.user.id, lessonIds[0], "   ", LATER)).toEqual({
      ok: true,
      note: null,
    });
    expect(getNote(db, base.user.id, lessonIds[0])).toBeNull();
  });
});

describe("listing Notes", () => {
  it("lists only the Student's own Notes, last edited first, with Lesson and Course", () => {
    const other = addStudent("Priya");
    saveNote(db, base.user.id, lessonIds[0], "older", NOW);
    saveNote(db, base.user.id, lessonIds[1], "newer", LATER);
    saveNote(db, other.id, lessonIds[0], "not mine", LATER);

    expect(listNotes(db, base.user.id)).toMatchObject([
      {
        body: "newer",
        lessonId: lessonIds[1],
        lessonTitle: "Lesson 2",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      { body: "older", lessonId: lessonIds[0] },
    ]);
  });
});
