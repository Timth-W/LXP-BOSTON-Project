import type { AssistantRequest, ModelResponse } from "./schema";

/** Safeguard: the AI can only suggest activities that are in the list it was given. */
export function sanitize(out: ModelResponse, req: AssistantRequest): ModelResponse {
  const ids = new Set(req.candidates.map((c) => c.id));
  const seen = new Set<string>();
  const suggestions = out.suggestions.filter((s) => ids.has(s.activityId) && !seen.has(s.activityId) && seen.add(s.activityId)).slice(0, 3);
  const draft = out.draft && (out.draft.activityId === null || ids.has(out.draft.activityId)) ? out.draft : null;
  return { ...out, suggestions, draft };
}
