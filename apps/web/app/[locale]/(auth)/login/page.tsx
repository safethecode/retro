import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/features/auth";
import { Link } from "@/i18n";

type LoginPageProps = {
	params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: LoginPageProps) {
	const { locale } = await params;
	setRequestLocale(locale);

	return <LoginContent />;
}

function LoginContent() {
	const t = useTranslations("auth");

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<h1 className="text-2xl font-bold">{t("login")}</h1>
				</div>
				<LoginForm />
				<p className="text-center text-sm text-gray-600">
					{t("noAccount")}{" "}
					<Link href="/register" className="text-black underline">
						{t("register")}
					</Link>
				</p>
			</div>
		</main>
	);
}
