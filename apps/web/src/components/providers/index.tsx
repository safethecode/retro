"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { QueryProvider } from "@/lib/query";

type ProvidersProps = {
	children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
	return (
		<SessionProvider>
			<QueryProvider>{children}</QueryProvider>
		</SessionProvider>
	);
}
