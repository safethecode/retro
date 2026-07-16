import { env } from "@/config/env";

type RequestConfig = RequestInit & {
	params?: Record<string, string>;
};

export type ApiError = { code: string; message: string; details?: unknown };

export type ApiResult<T> =
	| { success: true; data: T }
	| { success: false; error: ApiError; status: number };

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

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResult<T>> {
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
			const payload: unknown = await response.json().catch(() => undefined);
			return {
				success: false,
				error: readApiError(payload, response.statusText),
				status: response.status,
			};
		}

		const payload = (await response.json()) as { data: T };
		return { success: true, data: payload.data };
	} catch {
		return {
			success: false,
			error: { code: "NETWORK_ERROR", message: "Unable to reach the server" },
			status: 0,
		};
	}
}

function readApiError(payload: unknown, fallbackMessage: string): ApiError {
	if (
		typeof payload === "object" &&
		payload !== null &&
		"error" in payload &&
		typeof payload.error === "object" &&
		payload.error !== null &&
		"code" in payload.error &&
		typeof payload.error.code === "string" &&
		"message" in payload.error &&
		typeof payload.error.message === "string"
	) {
		return {
			code: payload.error.code,
			message: payload.error.message,
			...("details" in payload.error ? { details: payload.error.details } : {}),
		};
	}

	return { code: "HTTP_ERROR", message: fallbackMessage || "Request failed" };
}

function jsonBody(body: unknown): { body?: BodyInit } {
	return body === undefined ? {} : { body: JSON.stringify(body) };
}

export const api = {
	get<T>(endpoint: string, config?: RequestConfig) {
		return request<T>(endpoint, { ...config, method: "GET" });
	},

	post<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
		return request<T>(endpoint, {
			...config,
			method: "POST",
			...jsonBody(body),
		});
	},

	put<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
		return request<T>(endpoint, {
			...config,
			method: "PUT",
			...jsonBody(body),
		});
	},

	patch<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
		return request<T>(endpoint, {
			...config,
			method: "PATCH",
			...jsonBody(body),
		});
	},

	delete<T>(endpoint: string, config?: RequestConfig) {
		return request<T>(endpoint, { ...config, method: "DELETE" });
	},
};
