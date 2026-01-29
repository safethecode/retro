import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n";

type RegisterPageProps = {
	params: Promise<{ locale: string }>;
};

export default async function RegisterPage({ params }: RegisterPageProps) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations("auth");

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<h1 className="text-2xl font-bold">{t("register")}</h1>
				</div>
				<p className="text-center text-gray-500">
					회원가입 폼이 여기에 표시됩니다.
				</p>
				<p className="text-center text-sm text-gray-600">
					{t("hasAccount")}{" "}
					<Link href="/login" className="text-black underline">
						{t("login")}
					</Link>
				</p>
			</div>
		</main>
	);
}
