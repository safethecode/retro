import { env } from "@/src/env";

type RequestConfig = RequestInit & {
	params?: Record<string, string>;
};

type ApiResponse<T> =
	| { success: true; data: T }
	| { success: false; error: string; status: number };

const BASE_URL = env.NEXT_PUBLIC_API_URL ?? "";

function buildUrl(endpoint: string, params?: Record<string, string>): string {
	const url = new URL(endpoint, BASE_URL || window.location.origin);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
	}
	return url.toString();
}

async function request<T>(
	endpoint: string,
	config: RequestConfig = {},
): Promise<ApiResponse<T>> {
	const { params, ...init } = config;
	const url = buildUrl(endpoint, params);

	const headers = new Headers(init.headers);
	if (!headers.has("Content-Type") && init.body) {
		headers.set("Content-Type", "application/json");
	}

	try {
		const response = await fetch(url, {
			...init,
			headers,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			return {
				success: false,
				error: errorData.error ?? response.statusText,
				status: response.status,
			};
		}

		const data = await response.json();
		return { success: true, data };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			status: 0,
		};
	}
}

export const api = {
	get<T>(endpoint: string, config?: RequestConfig) {
		return request<T>(endpoint, { ...config, method: "GET" });
	},

	post<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
		return request<T>(endpoint, {
			...config,
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
		});
	},

	put<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
		return request<T>(endpoint, {
			...config,
			method: "PUT",
			body: body ? JSON.stringify(body) : undefined,
		});
	},

	patch<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
		return request<T>(endpoint, {
			...config,
			method: "PATCH",
			body: body ? JSON.stringify(body) : undefined,
		});
	},

	delete<T>(endpoint: string, config?: RequestConfig) {
		return request<T>(endpoint, { ...config, method: "DELETE" });
	},
};
