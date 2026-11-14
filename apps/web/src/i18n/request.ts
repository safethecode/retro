import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale: localeOverride }) => {
  const locale = localeOverride ?? (await rootParams.locale());
  if (!hasLocale(routing.locales, locale)) notFound();
  return { locale, messages: (await import(`./messages/${locale}.json`)).default };
});
