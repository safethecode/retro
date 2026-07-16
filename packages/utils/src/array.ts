export function unique<T>(array: T[]): T[] {
	return [...new Set(array)];
}

export function uniqueBy<T>(array: T[], key: keyof T): T[] {
	const seen = new Set();
	return array.filter((item) => {
		const value = item[key];
		if (seen.has(value)) {
			return false;
		}
		seen.add(value);
		return true;
	});
}

export function chunk<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

export function shuffle<T>(array: T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = result[i];
		result[i] = result[j] as T;
		result[j] = temp as T;
	}
	return result;
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
	return array.reduce(
		(acc, item) => {
			const group = String(item[key]);
			if (!acc[group]) {
				acc[group] = [];
			}
			acc[group].push(item);
			return acc;
		},
		{} as Record<string, T[]>,
	);
}

export function sortBy<T>(array: T[], key: keyof T, order: "asc" | "desc" = "asc"): T[] {
	return [...array].sort((a, b) => {
		const aVal = a[key];
		const bVal = b[key];

		if (aVal < bVal) return order === "asc" ? -1 : 1;
		if (aVal > bVal) return order === "asc" ? 1 : -1;
		return 0;
	});
}

export function intersection<T>(...arrays: T[][]): T[] {
	if (arrays.length === 0) return [];
	if (arrays.length === 1) return arrays[0] ?? [];

	return arrays.reduce((acc, array) => acc.filter((item) => array.includes(item)));
}

export function difference<T>(array1: T[], array2: T[]): T[] {
	return array1.filter((item) => !array2.includes(item));
}

export function flatten<T>(array: (T | T[])[], depth = 1): T[] {
	if (depth === 0) return array as T[];

	const result: T[] = [];
	for (const item of array) {
		if (Array.isArray(item)) {
			result.push(...flatten(item, depth - 1));
		} else {
			result.push(item);
		}
	}
	return result;
}

export function last<T>(array: T[]): T | undefined {
	return array[array.length - 1];
}

export function first<T>(array: T[]): T | undefined {
	return array[0];
}

export function isEmptyArray<T>(array: T[]): boolean {
	return array.length === 0;
}

export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
	const pass: T[] = [];
	const fail: T[] = [];
	for (const item of array) {
		if (predicate(item)) {
			pass.push(item);
		} else {
			fail.push(item);
		}
	}
	return [pass, fail];
}
