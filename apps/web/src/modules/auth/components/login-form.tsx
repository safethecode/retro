"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { getPathname } from "@/i18n";
import { safeCallbackUrl } from "../callback-url";
import { authClient } from "../client";
import { loginSchema } from "../schemas/auth.schema";

export function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(
    searchParams.get("callbackUrl") ?? getPathname({ href: "/dashboard", locale }),
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(data));
    if (!parsed.success) {
      setError(t("invalidForm"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.email(parsed.data);
      if (result.error) {
        setError(t("invalidCredentials"));
        return;
      }
      window.location.assign(callbackUrl);
    } catch {
      setError(t("loginError"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
      if (result.error) setError(t("loginError"));
    } catch {
      setError(t("loginError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className="mt-1 block w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            {t("password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            maxLength={128}
            autoComplete="current-password"
            className="mt-1 block w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isLoading ? t("loggingIn") : t("login")}
        </button>
      </form>
      {googleEnabled && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">{t("or")}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full rounded-md border px-4 py-2 disabled:opacity-50"
          >
            {t("signInWithGoogle")}
          </button>
        </>
      )}
    </div>
  );
}
