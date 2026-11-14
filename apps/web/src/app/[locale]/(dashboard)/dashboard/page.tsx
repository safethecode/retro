import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { type Locale, redirect, routing } from "@/i18n";
import { SignOutButton } from "@/modules/auth";
import { getSession } from "@/modules/auth/server";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const common = await getTranslations({ locale, namespace: "common" });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Suspense fallback={<p role="status">{common("loading")}</p>}>
        <AuthenticatedDashboard locale={locale} />
      </Suspense>
    </main>
  );
}

async function AuthenticatedDashboard({ locale }: { locale: Locale }) {
  const session = await getSession();
  if (!session) return redirect({ href: "/login", locale });
  const t = await getTranslations({ locale, namespace: "dashboard" });

  return (
    <>
      <h2 className="mt-4 text-xl">{t("welcome", { name: session.user.name })}</h2>
      <div className="mt-4">
        <SignOutButton className="rounded-md bg-black px-4 py-2 text-white" />
      </div>
    </>
  );
}
