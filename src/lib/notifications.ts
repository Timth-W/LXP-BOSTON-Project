/** Turns a stored notification (type + ids) into a sentence in the viewer's language. */
import type { Dict, NotifContext } from "@/i18n/en";
import type { Formatters } from "@/i18n";
import { activityById, userById } from "./selectors";
import type { Notification, State } from "./types";

export function notificationText(s: State, n: Notification, t: Dict, f: Formatters): string {
  const p = n.params;
  const link = p.actorId ? s.links.find((l) => l.familyId === p.actorId && l.seniorId === n.userId) : undefined;
  const activity = activityById(s, p.activityId);
  const ctx: NotifContext = {
    actor: userById(s, p.actorId)?.firstName ?? "",
    senior: userById(s, p.seniorId)?.firstName ?? "",
    activity: activity ? f.text(activity.title) : "",
    date: p.date ? f.date(p.date) : "",
    rating: p.rating ?? 0,
    reason: p.reason ?? "",
    hours: f.hours(p.minutes ?? 0),
    relation: link ? t.relations[link.relation] : "",
  };
  return t.notif[n.type](ctx);
}
