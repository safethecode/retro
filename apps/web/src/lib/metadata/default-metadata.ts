import type { Metadata } from "next";
import { env } from "@/config/env";

export const defaultMetadata: Metadata = {
	metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
	title: {
		default: "Web Starter",
		template: "%s | Web Starter",
	},
	description: "A scalable Next.js application starter.",
};
