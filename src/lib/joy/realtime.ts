/**
 * GPT Realtime 2.1 session for Joy (server side).
 * The browser never sees the OpenAI key: the server creates a short-lived client secret with the
 * instructions, the voice and the tools, then the browser connects directly over WebRTC.
 * Docs: https://developers.openai.com/api/docs/guides/realtime-webrtc
 */
import { z } from "zod";

export const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1";
export const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || "marin";

export const joySessionRequestSchema = z.object({
  locale: z.enum(["en", "fr"]),
  role: z.enum(["senior", "companion", "family"]),
  firstName: z.string().max(60),
  greeting: z.string().max(1200),
  proposals: z.array(z.object({ id: z.string().max(60), line: z.string().max(300), label: z.string().max(160) })).max(8),
});
export type JoySessionRequest = z.infer<typeof joySessionRequestSchema>;

export const JOY_TOOLS = [
  {
    type: "function",
    name: "show_proposal",
    description: "Highlight one proposal card on the user's screen while you talk about it.",
    parameters: {
      type: "object",
      properties: { proposal_id: { type: "string", description: "Exact id from the proposals list." } },
      required: ["proposal_id"],
    },
  },
  {
    type: "function",
    name: "open_confirmation",
    description:
      "Open the confirmation screen for a proposal the user said yes to. It does NOT book anything: the user must tap the green button.",
    parameters: {
      type: "object",
      properties: { proposal_id: { type: "string", description: "Exact id from the proposals list." } },
      required: ["proposal_id"],
    },
  },
  {
    type: "function",
    name: "find_activities",
    description: "Search real activities near the user when they ask for something not in the proposals. Seniors only.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["gardening", "cooking", "games", "culture", "walk", "music", "coffee"] },
        day: { type: "string", enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
      },
    },
  },
  {
    type: "function",
    name: "end_conversation",
    description: "Call when the user says goodbye or wants to stop.",
    parameters: { type: "object", properties: {} },
  },
] as const;

export function joyInstructions(req: JoySessionRequest): string {
  const language = req.locale === "fr" ? 'French, using the formal "vous"' : "English";
  const audience =
    req.role === "senior"
      ? "an older person who may feel isolated"
      : req.role === "family"
        ? "a relative who wants to help their loved one go out more"
        : "a student companion who accompanies older people";
  const list = req.proposals.map((p) => `- id "${p.id}": ${p.line} (card: ${p.label})`).join("\n") || "- (no proposals right now)";
  return `You are Joy, the voice of the JoyTo app. You are an AI and you never pretend to be a person.
You are talking with ${req.firstName}, ${audience}. Speak ${language}, warmly, slowly and simply. Never patronising, never medical.
Your goal is to lead to a real meeting with real people, not to keep the person on the phone.

Start right away, without waiting for the user, by saying this greeting in your own natural words:
"${req.greeting}"
While you mention a proposal, call show_proposal with its id.

Proposals (the only things you may offer; never invent an activity, a date, a price or a person):
${list}

Rules:
- Keep each answer to one or two short sentences, then let the person answer.
- When the person says yes to a proposal, call open_confirmation with its id and tell them to tap the green button to confirm. Never say that something is booked or paid before the app tells you it was confirmed.
- If they say no or not now, warmly offer the next proposal, or ask what they would like instead.
- If a senior asks for something else, call find_activities and offer what it returns.
- An accompanied outing costs 25 euros per hour, paid after the outing; only mention the price if asked or when opening a confirmation.
- Messages starting with [App] come from the app (for example a confirmation): acknowledge them in one short sentence.
- When the person says goodbye, say a short goodbye and call end_conversation.`;
}

/** Body sent to POST /v1/realtime/client_secrets. */
export function clientSecretBody(req: JoySessionRequest) {
  return {
    expires_after: { anchor: "created_at", seconds: 600 },
    session: {
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: joyInstructions(req),
      audio: {
        input: {
          transcription: { model: "gpt-4o-mini-transcribe", language: req.locale },
          turn_detection: { type: "semantic_vad" },
        },
        output: { voice: REALTIME_VOICE },
      },
      tools: JOY_TOOLS,
      tool_choice: "auto",
    },
  };
}
