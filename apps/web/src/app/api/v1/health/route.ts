export async function GET() {
	return Response.json({
		data: {
			status: "ok",
			timestamp: new Date().toISOString(),
		},
	});
}
