import questionsJson from "./questions.json";
import subjectsJson from "./subjects.json";
import cardsJson from "./flashcards.json";
import topicsJson from "./topics.json";
import stationsJson from "./osce-stations.json";
import type { State, Card, Topic } from "../lib/model";
export const questions = questionsJson;
export const subjects = subjectsJson;
export const stations = stationsJson;
export const subjectName = (id: string) =>
  subjects.find((s) => s.id === id)?.name ?? "Umum";
export const getCards = (s: State): Card[] =>
  [
    ...cardsJson.filter((c) => !s.cards.some((x) => x.id === c.id)),
    ...s.cards,
  ].filter((c) => !s.deletedCards.includes(c.id));
export const getTopics = (s: State): Topic[] =>
  [
    ...(topicsJson as Topic[]).filter(
      (c) => !s.topics.some((x) => x.id === c.id),
    ),
    ...s.topics,
  ].filter((c) => !s.deletedTopics.includes(c.id));
