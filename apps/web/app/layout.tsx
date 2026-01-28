import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { defaultMetadata } from "@/lib/metadata/default-metadata";
import { Providers } from "@/shared/components/providers";
import { pretendard } from "@/styles/fonts";
import "@/styles/globals.css";

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<html lang="ko" suppressHydrationWarning>
			<body className={`${pretendard.variable} antialiased`}>
				<Providers>{children}</Providers>
				<Analytics />
			</body>
		</html>
	);
}
