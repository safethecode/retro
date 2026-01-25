export function formatDate(
	date: Date | string | number,
	locale = "ko-KR",
	options?: Intl.DateTimeFormatOptions,
): string {
	const dateObj = new Date(date);
	return dateObj.toLocaleDateString(locale, options);
}

export function formatDateTime(
	date: Date | string | number,
	locale = "ko-KR",
): string {
	const dateObj = new Date(date);
	return dateObj.toLocaleString(locale);
}

export function getRelativeTime(
	date: Date | string | number,
	locale = "ko-KR",
): string {
	const dateObj = new Date(date);
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

	if (diffInSeconds < 60) {
		return rtf.format(-diffInSeconds, "second");
	}
	if (diffInSeconds < 3600) {
		return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
	}
	if (diffInSeconds < 86400) {
		return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
	}
	if (diffInSeconds < 604800) {
		return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
	}
	if (diffInSeconds < 2592000) {
		return rtf.format(-Math.floor(diffInSeconds / 604800), "week");
	}
	if (diffInSeconds < 31536000) {
		return rtf.format(-Math.floor(diffInSeconds / 2592000), "month");
	}
	return rtf.format(-Math.floor(diffInSeconds / 31536000), "year");
}

export function isToday(date: Date | string | number): boolean {
	const dateObj = new Date(date);
	const today = new Date();
	return (
		dateObj.getDate() === today.getDate() &&
		dateObj.getMonth() === today.getMonth() &&
		dateObj.getFullYear() === today.getFullYear()
	);
}

export function isPast(date: Date | string | number): boolean {
	return new Date(date).getTime() < Date.now();
}

export function isFuture(date: Date | string | number): boolean {
	return new Date(date).getTime() > Date.now();
}

export function addDays(date: Date | string | number, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

export function startOfDay(date: Date | string | number): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result;
}

export function endOfDay(date: Date | string | number): Date {
	const result = new Date(date);
	result.setHours(23, 59, 59, 999);
	return result;
}
