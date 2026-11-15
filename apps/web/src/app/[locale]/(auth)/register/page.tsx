import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link, routing } from "@/i18n";
import { RegisterForm } from "@/modules/auth";

type RegisterPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t("register")}</h1>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-gray-600">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-black underline">
            {t("login")}
          </Link>
        </p>
      </div>
    </main>
  );
}
