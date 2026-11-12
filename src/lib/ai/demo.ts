/**
 * Demo mode: used when no API key is configured or when the AI does not answer.
 * It reproduces the expected behaviour with simple rules (keywords and score),
 * so the demonstration never gets stuck. Understands English and French.
 */
import { DAY_KEYS, WEEK_ORDER } from "../constants";
import { addMinutes, dayKey, joinNames, toDate, toLocalIso } from "../format";
import type { Category, DayKey, Intent, Locale } from "../types";
import type { AssistantRequest, Candidate, ModelResponse } from "./schema";

const KEYWORDS: Record<Category, RegExp> = {
  gardening: /garden|plant|flower|rose|bulb|jardin|plante|fleur|potager|rosier|bulbe/,
  cooking: /cook|recipe|soup|cake|tart|bake|meal|cuisin|recette|soupe|gateau|tarte|repas|patisser/,
  games: /game|card|scrabble|domino|jeu|carte|belote/,
  culture: /museum|exhibition|theatre|cinema|culture|tour|painting|musee|expo|visite|tableau/,
  walk: /walk|stroll|park|promen|balade|marche|parc/,
  music: /music|sing|choir|concert|musique|chant|chorale/,
  coffee: /coffee|chat|talk|cafe|discuter|papoter|bavarder/,
};

const DAY_WORDS: Record<DayKey, RegExp> = {
  mon: /monday|lundi/,
  tue: /tuesday|mardi/,
  wed: /wednesday|mercredi/,
  thu: /thursday|jeudi/,
  fri: /friday|vendredi/,
  sat: /saturday|samedi/,
  sun: /sunday|dimanche/,
};

const TEXT = {
  en: {
    category: {
      gardening: "gardening",
      cooking: "cooking",
      games: "games",
      culture: "culture",
      walk: "walks",
      music: "music",
      coffee: "coffee and chat",
    },
    day: { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" },
    or: "or",
    vagueReply: "With pleasure. To help you best, what would you like to do?",
    vagueQuestion: "Gardening, cooking, a walk, a card game, or simply a coffee?",
    group: "with other people",
    companion: "with someone to go with you",
    understood: (u: string) => `Here is what I understood: ${u}.`,
    found: "Here is what I suggest.",
    notFound: "I could not find a matching activity. Would you like to try another day?",
    draftFound: " I also prepared a companion request: you will check it before publishing.",
    draftAlone: " I still prepared a companion request for you.",
    likes: (c: string) => `it matches what you enjoy (${c})`,
    mates: (names: string, many: boolean) => `${names} ${many ? "are" : "is"} going and ${many ? "share" : "shares"} your interests`,
    seats: (n: number) => `${n} ${n === 1 ? "seat" : "seats"} left`,
    noteActivity: (title: string) => `Go with me to “${title}”.`,
    noteFree: (msg: string) => `Someone to go with me: ${msg}`,
  },
  fr: {
    category: {
      gardening: "jardinage",
      cooking: "cuisine",
      games: "jeux",
      culture: "culture",
      walk: "balades",
      music: "musique",
      coffee: "café et discussion",
    },
    day: { mon: "lundi", tue: "mardi", wed: "mercredi", thu: "jeudi", fri: "vendredi", sat: "samedi", sun: "dimanche" },
    or: "ou",
    vagueReply: "Avec plaisir. Pour bien vous conseiller, qu'aimeriez-vous faire ?",
    vagueQuestion: "Plutôt jardiner, cuisiner, marcher, jouer aux cartes ou simplement prendre un café ?",
    group: "avec d'autres personnes",
    companion: "avec quelqu'un pour vous accompagner",
    understood: (u: string) => `J'ai compris : ${u}.`,
    found: "Voici ce que je vous propose.",
    notFound: "Je n'ai pas trouvé d'activité qui corresponde. Voulez-vous essayer un autre jour ?",
    draftFound: " J'ai aussi préparé une demande d'accompagnement, que vous vérifierez avant de la publier.",
    draftAlone: " J'ai tout de même préparé une demande d'accompagnement.",
    likes: (c: string) => `cela correspond à vos goûts (${c})`,
    mates: (names: string, many: boolean) => `${names} y ${many ? "vont" : "va"} et ${many ? "partagent" : "partage"} vos goûts`,
    seats: (n: number) => `il reste ${n} place${n > 1 ? "s" : ""}`,
    noteActivity: (title: string) => `M'accompagner à « ${title} ».`,
    noteFree: (msg: string) => `Être accompagné·e : ${msg}`,
  },
} as const;

const normalize = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function parseIntent(text: string, today: string): Intent {
  const t = normalize(text);
  const categories = (Object.keys(KEYWORDS) as Category[]).filter((k) => KEYWORDS[k].test(t));
  const days: DayKey[] = WEEK_ORDER.filter((d) => DAY_WORDS[d].test(t));
  if (/week.?end/.test(t)) days.push("sat", "sun");
  const todayIndex = toDate(today).getDay();
  if (/tomorrow|demain/.test(t)) days.push(DAY_KEYS[(todayIndex + 1) % 7]);
  if (/today|aujourd/.test(t)) days.push(DAY_KEYS[todayIndex]);
  let moment: Intent["moment"] = null;
  if (/morning|matin/.test(t)) moment = "am";
  if (/afternoon|apres.?midi|aprem/.test(t)) moment = "pm";
  const wantsCompanion =
    /accompan|someone to (go|come)|go with me|come with me|alone|on my own|pick me up|don.?t dare|dare not|quelqu.un pour|pas (toute )?seule?|venir me chercher|m.emmener|avec moi|n.ose pas/.test(
      t,
    );
  const wantsGroup = /meet|people|group|together|others|rencontr|personnes|gens|groupe|ensemble|du monde/.test(t);
  return { categories, days: Array.from(new Set(days)), moment, wantsCompanion, wantsGroup };
}

const slotOfIso = (iso: string) => `${dayKey(iso)}-${toDate(iso).getHours() < 12 ? "am" : "pm"}`;

function score(c: Candidate, intent: Intent, interests: string[], availability: string[]) {
  let s = 0;
  if (intent.categories.includes(c.category)) s += 6;
  if (interests.includes(c.category)) s += 3;
  if (availability.includes(slotOfIso(c.start))) s += 2;
  s += c.attendees.filter((a) => a.interests.some((i) => interests.includes(i))).length;
  return s;
}

function reasonFor(c: Candidate, req: AssistantRequest, locale: Locale): string {
  const T = TEXT[locale];
  const parts: string[] = [];
  if (req.profile.interests.includes(c.category)) parts.push(T.likes(T.category[c.category]));
  const mates = c.attendees.filter((a) => a.interests.some((i) => req.profile.interests.includes(i))).map((a) => a.firstName);
  if (mates.length) parts.push(T.mates(joinNames(mates, locale), mates.length > 1));
  if (!parts.length) parts.push(T.seats(c.seatsLeft));
  return `${capitalize(parts.join(", "))}.`;
}

export function demoAssistant(req: AssistantRequest): ModelResponse {
  const locale: Locale = req.locale;
  const T = TEXT[locale];
  const intent = parseIntent(req.message, req.today);
  const vague = !intent.categories.length && !intent.days.length && !intent.moment && !intent.wantsCompanion && !intent.wantsGroup;
  if (vague) {
    return { reply: T.vagueReply, intent, suggestions: [], clarification: T.vagueQuestion, draft: null };
  }

  let list = req.candidates;
  if (intent.days.length) list = list.filter((c) => intent.days.includes(dayKey(c.start)));
  if (intent.moment) list = list.filter((c) => (toDate(c.start).getHours() < 12 ? "am" : "pm") === intent.moment);
  if (intent.categories.length && list.some((c) => intent.categories.includes(c.category))) {
    list = list.filter((c) => intent.categories.includes(c.category));
  }
  const { interests, availability } = req.profile;
  const ranked = [...list]
    .sort((a, b) => score(b, intent, interests, availability) - score(a, intent, interests, availability) || a.start.localeCompare(b.start))
    .slice(0, 3);
  const suggestions = ranked.map((c) => ({ activityId: c.id, reason: reasonFor(c, req, locale) }));

  let draft: ModelResponse["draft"] = null;
  if (intent.wantsCompanion) {
    const first = ranked[0];
    if (first) {
      draft = {
        activityId: first.id,
        type: "activity",
        note: T.noteActivity(first.title),
        start: addMinutes(first.start, -15),
        durationMin: 150,
      };
    } else {
      const d = toDate(req.today);
      d.setDate(d.getDate() + 2);
      d.setHours(intent.moment === "am" ? 10 : 14, 30, 0, 0);
      draft = {
        activityId: null,
        type: intent.categories.includes("walk") ? "walk" : "company",
        note: T.noteFree(req.message).slice(0, 300),
        start: toLocalIso(d),
        durationMin: 90,
      };
    }
  }

  const understood = [
    intent.categories.map((c) => T.category[c]).join(", "),
    intent.days.map((d) => T.day[d]).join(` ${T.or} `),
    intent.wantsGroup ? T.group : "",
    intent.wantsCompanion ? T.companion : "",
  ]
    .filter(Boolean)
    .join(", ");
  const head = understood ? `${T.understood(understood)} ` : "";
  const reply = suggestions.length ? `${head}${T.found}${draft ? T.draftFound : ""}` : `${head}${T.notFound}${draft ? T.draftAlone : ""}`;
  return { reply, intent, suggestions, clarification: null, draft };
}
