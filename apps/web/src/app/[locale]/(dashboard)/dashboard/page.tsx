import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignOutButton } from "@/modules/auth";
import { auth } from "@/modules/auth/server";

type DashboardPageProps = {
	params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
	const { locale } = await params;
	setRequestLocale(locale);

	const session = await auth();

	if (!session?.user) {
		redirect("/login");
	}

	const t = await getTranslations("dashboard");
	const name = session.user.name ?? "User";

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8">
			<h1 className="text-2xl font-bold">{t("welcome", { name })}</h1>
			<div className="mt-4">
				<SignOutButton className="rounded-md bg-black px-4 py-2 text-white" />
			</div>
		</main>
	);
}
