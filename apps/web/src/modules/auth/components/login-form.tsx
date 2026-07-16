"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { type FormEvent, useState } from "react";
import { safeCallbackUrl } from "../callback-url";

export function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		try {
			const result = await signIn("credentials", {
				email,
				password,
				redirect: false,
			});

			if (result?.error) {
				setError("이메일 또는 비밀번호가 올바르지 않습니다");
				return;
			}

			router.push(callbackUrl);
			router.refresh();
		} catch {
			setError("로그인 중 오류가 발생했습니다");
		} finally {
			setIsLoading(false);
		}
	}

	async function handleGoogleSignIn() {
		setIsLoading(true);
		await signIn("google", { callbackUrl });
	}

	return (
		<div className="w-full max-w-md space-y-6">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="email" className="block text-sm font-medium">
						이메일
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						autoComplete="email"
						className="mt-1 block w-full rounded-md border px-3 py-2"
						disabled={isLoading}
					/>
				</div>
				<div>
					<label htmlFor="password" className="block text-sm font-medium">
						비밀번호
					</label>
					<input
						id="password"
						name="password"
						type="password"
						required
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
					{isLoading ? "로그인 중..." : "로그인"}
				</button>
			</form>

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t" />
				</div>
				<div className="relative flex justify-center text-sm">
					<span className="bg-white px-2 text-gray-500">또는</span>
				</div>
			</div>

			<button
				type="button"
				onClick={handleGoogleSignIn}
				disabled={isLoading}
				className="w-full rounded-md border px-4 py-2 disabled:opacity-50"
			>
				Google로 계속하기
			</button>
		</div>
	);
}
