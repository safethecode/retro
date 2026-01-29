import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/shared/components/language-switcher";

type HomePageProps = {
	params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations("home");

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8">
			<div className="absolute top-4 right-4">
				<LanguageSwitcher />
			</div>
			<h1 className="text-4xl font-bold">{t("welcome")}</h1>
		</main>
	);
}
