/**
 * Contract between the Assistant screen and the /api/assistant route.
 * Answers from the AI are validated with these schemas before being shown.
 */
import { z } from "zod";

export const CATEGORY_VALUES = ["gardening", "cooking", "games", "culture", "walk", "music", "coffee"] as const;
export const OUTING_VALUES = ["activity", "walk", "errands", "company"] as const;
export const DAY_VALUES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const candidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(CATEGORY_VALUES),
  start: z.string(),
  place: z.string(),
  seatsLeft: z.number(),
  attendees: z.array(z.object({ firstName: z.string(), interests: z.array(z.string()) })),
});

export const assistantRequestSchema = z.object({
  locale: z.enum(["en", "fr"]).default("en"),
  message: z.string().trim().min(1).max(500),
  today: z.string(),
  profile: z.object({
    firstName: z.string(),
    interests: z.array(z.string()),
    availability: z.array(z.string()),
    sector: z.string(),
  }),
  history: z.array(z.object({ from: z.enum(["user", "ai"]), text: z.string().max(1200) })).max(10),
  candidates: z.array(candidateSchema).max(40),
});

export const intentSchema = z.object({
  categories: z.array(z.enum(CATEGORY_VALUES)).default([]),
  days: z.array(z.enum(DAY_VALUES)).default([]),
  moment: z.enum(["am", "pm"]).nullable().default(null),
  wantsCompanion: z.boolean().default(false),
  wantsGroup: z.boolean().default(false),
});

export const draftSchema = z.object({
  activityId: z.string().nullable(),
  type: z.enum(OUTING_VALUES),
  note: z.string().max(300),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  durationMin: z.number().int().min(60).max(240),
});

/** Raw answer expected from the language model. */
export const modelResponseSchema = z.object({
  reply: z.string().min(1).max(600),
  intent: intentSchema,
  suggestions: z
    .array(z.object({ activityId: z.string(), reason: z.string().max(200) }))
    .max(5)
    .default([]),
  clarification: z.string().nullable().default(null),
  draft: draftSchema.nullable().default(null),
});

export type Candidate = z.infer<typeof candidateSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type ModelResponse = z.infer<typeof modelResponseSchema>;
export type AssistantResponse = ModelResponse & { source: "ai" | "demo" };
