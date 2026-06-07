import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	// Characters are not available in the Marvel metadata API
	// Return empty results in legacy format
	const data = {
		data: {
			offset: 0,
			limit: 1,
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
