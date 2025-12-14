import { useRef, useEffect, useCallback } from "react";

export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay = 500,
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(
          () => {
            callback(...args);
            lastRun.current = Date.now();
          },
          delay - timeSinceLastRun,
        );
      }
    }) as T,
    [callback, delay],
  );
}
