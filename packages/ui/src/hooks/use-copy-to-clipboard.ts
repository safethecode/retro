import { useCallback, useState } from "react";

interface UseCopyToClipboardReturn {
  isCopied: boolean;
  copyToClipboard: (text: string) => Promise<void>;
}

export function useCopyToClipboard(): UseCopyToClipboardReturn {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      setIsCopied(false);
    }
  }, []);

  return { isCopied, copyToClipboard };
}
