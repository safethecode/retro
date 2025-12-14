export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  CONTACT: "/contact",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
