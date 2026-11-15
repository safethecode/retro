import { AppError } from "./app-error";

const maximumBodyBytes = 64 * 1024;

export async function readRequestBody(request: Request): Promise<string> {
  const contentLength = Number(request.headers.get("Content-Length"));
  if (contentLength > maximumBodyBytes)
    throw new AppError("PAYLOAD_TOO_LARGE", 413, "Request body is too large");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBodyBytes) {
        await reader.cancel();
        throw new AppError("PAYLOAD_TOO_LARGE", 413, "Request body is too large");
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
