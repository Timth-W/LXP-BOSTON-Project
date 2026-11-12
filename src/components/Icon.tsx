/** Line icons (24 × 24, stroke 1.8), drawn for JoyTo in the style of the moodboard. */
import type { Category } from "@/lib/types";

const PATHS = {
  home: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9.5 20v-6h5v6",
  sparkle: "M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  calendar: "M4 6.5h16v13.5H4zM4 10.5h16M8.5 3.5v5M15.5 3.5v5",
  pin: "M12 21s-6.5-6.1-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.9 12 21 12 21zM12 12.3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  user: "M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zM4 20.5c.8-3.9 4-6 8-6s7.2 2.1 8 6",
  users:
    "M9 11.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2zM2.5 20c.7-3.4 3.2-5.3 6.5-5.3s5.8 1.9 6.5 5.3M16 4.6a3.4 3.4 0 0 1 0 6.6M18 14.9c2 .6 3.2 2.4 3.6 5.1",
  bell: "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5zM10 20.5a2.2 2.2 0 0 0 4 0",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z",
  euro: "M17.5 6.5A7 7 0 1 0 17.5 17.5M4 10.5h9M4 13.5h9",
  wallet: "M4 7.5h15.5v12H4zM4 7.5l12-3.5v3.5M15.5 13.5h1.5",
  gift: "M4 10h16v3.5H4zM5.5 13.5V20h13v-6.5M12 10v10M12 10S10.8 5 8.3 5a2 2 0 0 0 0 4.2c1.5.5 3.7.8 3.7.8zM12 10s1.2-5 3.7-5a2 2 0 0 1 0 4.2c-1.5.5-3.7.8-3.7.8z",
  lock: "M6 10.5h12V20H6zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2.5",
  unlock: "M6 10.5h12V20H6zM8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2M12 14v2.5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6 6 18",
  chevronLeft: "M14.5 5.5 8 12l6.5 6.5",
  chevronRight: "M9.5 5.5 16 12l-6.5 6.5",
  chevronDown: "M5.5 9.5 12 16l6.5-6.5",
  plus: "M12 5v14M5 12h14",
  mic: "M12 3.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3zM6 11.5a6 6 0 0 0 12 0M12 17.5V21",
  send: "M4 12 20 4l-4.5 16-3.5-6.5zM12 13.5 20 4",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.6 5.5 3.6 9s-1.1 6.5-3.6 9c-2.5-2.5-3.6-5.5-3.6-9S9.5 5.5 12 3z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5.3l3.5 2.2",
  star: "M12 3.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.4 6.9 19.2 8 13.6 3.8 9.7l5.7-.7z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  copy: "M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4",
  logout: "M14.5 4.5h4.5v15h-4.5M10 16.5 14.5 12 10 7.5M14.5 12H4",
  map: "M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5zM9 4v13.5M15 6.5V20",
  list: "M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.5M4 12h.5M4 17.5h.5",
  alert: "M12 4 21 19.5H3zM12 10v4.5M12 17v.3",
  shield: "M12 3.5 19 6v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6zM8.8 12l2.3 2.3 4.2-4.6",
  arrowRight: "M4.5 12h15M13.5 6l6 6-6 6",
  refresh: "M19.5 8.5A8 8 0 0 0 5 7.5M4.5 4v4h4M4.5 15.5A8 8 0 0 0 19 16.5M19.5 20v-4h-4",
  menu: "M4 7h16M4 12h16M4 17h16",
  bench: "M4 10.5h16M5 7h14M6 10.5v8M18 10.5v8M3.5 14.5h17",
  tree: "M12 21v-6M12 15c-4 0-6.5-2.3-6.5-5.3 0-2 1.2-3.6 2.8-4.2A4.2 4.2 0 0 1 12 3a4.2 4.2 0 0 1 3.7 2.5c1.6.6 2.8 2.2 2.8 4.2 0 3-2.5 5.3-6.5 5.3zM12 15l-2.5-2.5M12 13.5l2.2-2",
  leaf: "M5 19c0-8 5-13.5 14-14-.5 9-6 14-14 14zM5 19 13 11",
  pot: "M4 10.5h16M5.5 10.5l1 8.5h11l1-8.5M9 7.5c0-1.4.9-2.5 2-2.5s2 1.1 2 2.5M15 7.5c0-1.2.6-2 1.5-2",
  dice: "M5 5h14v14H5zM9 9h.1M15 9h.1M12 12h.1M9 15h.1M15 15h.1",
  museum: "M3.5 9 12 4l8.5 5zM5.5 9v8.5M10 9v8.5M14 9v8.5M18.5 9v8.5M3.5 20h17",
  shoe: "M4 16.5V8.5c2.5 0 3.5 2 6 2l2.5-1.5c2.6 2.6 5 3.3 7.5 4v3.5zM4 19.5h16",
  music: "M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
  coffee:
    "M5 9h11v5.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c-.6 1 .6 1.6 0 3M11.5 3.5c-.6 1 .6 1.6 0 3",
  dog: "M5.5 9.5 4 5.5l4 2h5l3.5-2.5 1.2 3L20 9l-.5 3H17v5.5h-2.5V15h-5v2.5H7V12z",
  basket: "M4 10h16l-1.5 9.5h-13zM8 10l3-5.5M16 10l-3-5.5M9.5 13.5v3M14.5 13.5v3",
  chat: "M4.5 5.5h15v10H11l-4.5 3.5v-3.5h-2z",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7 7 0 0 1-1.7 1L15.3 20h-3.6l-.3-1.9a7 7 0 0 1-1.7-1l-1.9.7-1.8-3.1 1.6-1.2a7 7 0 0 1 0-2l-1.6-1.2 1.8-3.1 1.9.7a7 7 0 0 1 1.7-1L11.7 4h3.6l.3 1.9a7 7 0 0 1 1.7 1l1.9-.7 1.8 3.1-1.6 1.2a7 7 0 0 1 0 2z",
} as const;

export type IconName = keyof typeof PATHS;

export const CATEGORY_ICON: Record<Category, IconName> = {
  gardening: "leaf",
  cooking: "pot",
  games: "dice",
  culture: "museum",
  walk: "tree",
  music: "music",
  coffee: "coffee",
};

export function Icon({ name, size = 22, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
