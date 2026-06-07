import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const urlParams = new URL(request.url).searchParams;
	const page = parseInt(urlParams.get("page") || "1", 10);
	const limit = parseInt(urlParams.get("limit") || "20", 10);
	const offset = (page - 1) * limit;

	// Characters are not available in the Marvel metadata API
	// Return empty results in legacy format
	const data = {
		data: {
			offset,
			limit,
			total: 0,
			count: 0,
			results: [],
		},
	};

	return new NextResponse(JSON.stringify(data), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}
