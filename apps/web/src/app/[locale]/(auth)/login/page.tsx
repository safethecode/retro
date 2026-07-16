import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n";
import { LoginForm } from "@/modules/auth";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t("login")}</h1>
        </div>
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-gray-600">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-black underline">
            {t("register")}
          </Link>
        </p>
      </div>
    </main>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md space-y-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-16 bg-gray-200 rounded-md" />
        <div className="h-16 bg-gray-200 rounded-md" />
        <div className="h-10 bg-gray-300 rounded-md" />
      </div>
      <div className="h-10 bg-gray-200 rounded-md" />
    </div>
  );
}
