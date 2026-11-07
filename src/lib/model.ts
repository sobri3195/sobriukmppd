import { z } from "zod";
const id = z.string().min(1).max(150);
const text = z.string().max(20000);
const date = z.iso.date();
const stamp = z.iso.datetime();
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  fullName: text,
  faculty: text,
  status: z.enum(["Koas", "First Taker", "Retaker"]),
  cbt: date,
  osce: date,
  dailyMinutes: z.number().int().min(5).max(720),
  dailyQuestions: z.number().int().min(1).max(500),
  targetScore: z.number().min(1).max(100),
  priorities: z.array(id),
  theme: z.enum(["light", "dark"]),
});
export const taskSchema = z.object({
  id,
  title: z.string().trim().min(1).max(200),
  description: text.default(""),
  subjectId: id,
  topicId: z.string().default(""),
  date,
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("09:00"),
  endTime: z.string().default(""),
  durationMinutes: z.number().int().min(1).max(720),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]),
  type: z.enum([
    "reading",
    "question_practice",
    "review",
    "flashcard",
    "osce",
    "video",
    "other",
  ]),
  notes: text.default(""),
  createdAt: stamp,
  updatedAt: stamp,
  generated: z.boolean().default(false),
});
const sessionSchema = z.object({
  id,
  subjectId: id,
  topicId: z.string().default(""),
  minutes: z.number().min(0).max(1440),
  at: stamp,
});
const timerSchema = z.object({
  id,
  subjectId: id,
  topicId: z.string(),
  mode: z.enum(["stopwatch", "pomodoro", "custom"]),
  targetSeconds: z.number().min(60).max(86400),
  startedAt: z.number(),
  elapsedMs: z.number().min(0),
  running: z.boolean(),
});
const quizSchema = z.object({
  id,
  questionIds: z.array(id).min(1).max(500),
  answers: z.record(id, id),
  flags: z.array(id),
  startedAt: stamp,
  deadline: z.number(),
  submittedAt: stamp.nullable(),
  status: z.enum(["in_progress", "submitted", "expired", "cancelled"]),
  exam: z.boolean(),
});
const cardSchema = z.object({
  id,
  subjectId: id,
  front: z.string().min(1).max(5000),
  back: z.string().min(1).max(10000),
  favorite: z.boolean().default(false),
});
export const reviewSchema = z.object({
  id,
  cardId: id,
  at: stamp,
  quality: z.number().int().min(0).max(5),
  ease: z.number().min(1.3),
  repetition: z.number().int().min(0),
  interval: z.number().int().min(1),
  dueDate: date,
});
const noteSchema = z.object({
  id,
  title: z.string().min(1).max(200),
  body: text,
  subjectId: id,
  tags: z.string(),
  pinned: z.boolean(),
  updatedAt: stamp,
});
const topicSchema = z.object({
  id,
  subjectId: id,
  title: z.string().min(1).max(200),
  status: z.enum([
    "Belum dipelajari",
    "Sedang dipelajari",
    "Sudah dipelajari",
    "Perlu review",
    "Dikuasai",
  ]),
  notes: text,
  bookmark: z.boolean(),
});
const osceSchema = z.object({
  id,
  stationId: id,
  at: stamp,
  checked: z.array(id),
  notes: text,
  seconds: z.number().min(0),
});
export const stateSchema = z.object({
  version: z.literal(1),
  profile: profileSchema.nullable(),
  tasks: z.array(taskSchema).max(10000),
  sessions: z.array(sessionSchema).max(100000),
  timer: timerSchema.nullable(),
  quizzes: z.array(quizSchema).max(10000),
  bookmarks: z.array(id),
  cards: z.array(cardSchema).max(10000),
  deletedCards: z.array(id),
  reviews: z.array(reviewSchema).max(100000),
  notes: z.array(noteSchema).max(10000),
  topics: z.array(topicSchema).max(10000),
  deletedTopics: z.array(id),
  osce: z.array(osceSchema).max(10000),
});
export type Profile = z.infer<typeof profileSchema>;
export type Task = z.infer<typeof taskSchema>;
export type State = z.infer<typeof stateSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type Review = z.infer<typeof reviewSchema>;
export const emptyState = (): State => ({
  version: 1,
  profile: null,
  tasks: [],
  sessions: [],
  timer: null,
  quizzes: [],
  bookmarks: [],
  cards: [],
  deletedCards: [],
  reviews: [],
  notes: [],
  topics: [],
  deletedTopics: [],
  osce: [],
});
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
