export const APP_CONFIG = {
  NAME: "Retro Boilerplate",
  DESCRIPTION: "A modern Next.js boilerplate",
  LOCALE: "ko-KR",
  TIMEZONE: "Asia/Seoul",
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
} as const;

export const STORAGE_KEYS = {
  THEME: "theme",
  LOCALE: "locale",
} as const;

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

export const DELAYS = {
  SEARCH: 300,
  RESIZE: 150,
  SCROLL: 100,
  INPUT: 500,
} as const;
