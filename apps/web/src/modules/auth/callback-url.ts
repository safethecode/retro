const fallbackCallbackUrl = "/dashboard";
const internalOrigin = "https://internal.invalid";

export function safeCallbackUrl(callbackUrl: string | null | undefined): string {
	if (!callbackUrl?.startsWith("/") || callbackUrl.startsWith("//") || callbackUrl.includes("\\")) {
		return fallbackCallbackUrl;
	}

	try {
		const url = new URL(callbackUrl, internalOrigin);
		if (url.origin !== internalOrigin) {
			return fallbackCallbackUrl;
		}

		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return fallbackCallbackUrl;
	}
}
