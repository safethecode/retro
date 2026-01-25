import { useEffect, useRef } from "react";

export function useEventListener<K extends keyof WindowEventMap>(
	eventName: K,
	handler: (event: WindowEventMap[K]) => void,
	element?: HTMLElement | Window,
): void {
	const savedHandler = useRef(handler);

	useEffect(() => {
		savedHandler.current = handler;
	}, [handler]);

	useEffect(() => {
		const targetElement = element || window;
		if (!targetElement?.addEventListener) return;

		const eventListener = (event: Event) =>
			savedHandler.current(event as WindowEventMap[K]);

		targetElement.addEventListener(eventName, eventListener);

		return () => {
			targetElement.removeEventListener(eventName, eventListener);
		};
	}, [eventName, element]);
}
