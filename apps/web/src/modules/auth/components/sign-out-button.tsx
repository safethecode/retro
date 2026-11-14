"use client";

import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { getPathname } from "@/i18n";
import { authClient } from "../client";

type SignOutButtonProps = { children?: ReactNode; className?: string };

export function SignOutButton({ children, className }: SignOutButtonProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(true);
        return;
      }
      window.location.assign(getPathname({ href: "/", locale }));
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleSignOut} disabled={isLoading} className={className}>
        {children ?? t("logout")}
      </button>
      {error && <p role="alert">{t("logoutError")}</p>}
    </>
  );
}
