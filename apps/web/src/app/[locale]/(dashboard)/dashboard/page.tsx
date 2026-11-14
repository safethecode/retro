import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, routing } from "@/i18n";
import { SignOutButton } from "@/modules/auth";
import { getSession } from "@/modules/auth/server";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();

  if (!session?.user) {
    return redirect({ href: "/login", locale });
  }

  const t = await getTranslations("dashboard");
  const name = session.user.name ?? "User";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">{t("welcome", { name })}</h1>
      <div className="mt-4">
        <SignOutButton className="rounded-md bg-black px-4 py-2 text-white" />
      </div>
    </main>
  );
}
