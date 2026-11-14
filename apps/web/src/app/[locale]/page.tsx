import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { type Locale, routing } from "@/i18n";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Welcome locale={locale} />
    </main>
  );
}

async function Welcome({ locale }: { locale: Locale }) {
  "use cache";
  cacheLife("hours");
  const t = await getTranslations({ locale, namespace: "home" });
  return <h1 className="text-4xl font-bold">{t("welcome")}</h1>;
}
