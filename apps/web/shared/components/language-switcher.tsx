"use client";

import { useLocale } from "next-intl";
import {
	type Locale,
	localeNames,
	locales,
	usePathname,
	useRouter,
} from "@/i18n";

export function LanguageSwitcher() {
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();

	function handleChange(newLocale: Locale) {
		router.replace(pathname, { locale: newLocale });
	}

	return (
		<div className="flex gap-2">
			{locales.map((l) => (
				<button
					key={l}
					type="button"
					onClick={() => handleChange(l)}
					className={`px-2 py-1 text-sm rounded ${
						locale === l
							? "bg-black text-white"
							: "bg-gray-100 text-gray-700 hover:bg-gray-200"
					}`}
					disabled={locale === l}
				>
					{localeNames[l]}
				</button>
			))}
		</div>
	);
}
