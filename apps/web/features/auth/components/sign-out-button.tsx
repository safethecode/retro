"use client";

import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

type SignOutButtonProps = {
	children?: ReactNode;
	className?: string;
};

export function SignOutButton({
	children = "로그아웃",
	className,
}: SignOutButtonProps) {
	async function handleSignOut() {
		await signOut({ callbackUrl: "/" });
	}

	return (
		<button type="button" onClick={handleSignOut} className={className}>
			{children}
		</button>
	);
}
