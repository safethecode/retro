import type { Locale } from "./config";
import type messages from "./messages/ko.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
