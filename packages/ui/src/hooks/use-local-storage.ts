import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(
	key: string,
	initialValue: T,
): [T, (value: T | ((val: T) => T)) => void, () => void] {
	const [storedValue, setStoredValue] = useState<T>(() => {
		if (typeof window === "undefined") {
			return initialValue;
		}

		try {
			const item = window.localStorage.getItem(key);
			return item ? (JSON.parse(item) as T) : initialValue;
		} catch {
			return initialValue;
		}
	});

	const setValue = useCallback(
		(value: T | ((val: T) => T)) => {
			try {
				const valueToStore = value instanceof Function ? value(storedValue) : value;
				setStoredValue(valueToStore);

				if (typeof window !== "undefined") {
					window.localStorage.setItem(key, JSON.stringify(valueToStore));
				}
			} catch {}
		},
		[key, storedValue],
	);

	const removeValue = useCallback(() => {
		try {
			if (typeof window !== "undefined") {
				window.localStorage.removeItem(key);
				setStoredValue(initialValue);
			}
		} catch {}
	}, [key, initialValue]);

	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === key && e.newValue) {
				try {
					setStoredValue(JSON.parse(e.newValue) as T);
				} catch {}
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [key]);

	return [storedValue, setValue, removeValue];
}
