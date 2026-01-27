import { successResponse } from "@/lib/api";

export async function GET() {
	return successResponse({
		status: "ok",
		timestamp: new Date().toISOString(),
	});
}
