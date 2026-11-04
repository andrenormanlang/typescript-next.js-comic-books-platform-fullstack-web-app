export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

// Constant-time string comparison, so the secret can't be guessed byte by byte.
function safeEqual(a: string, b: string): boolean {
	const enc = new TextEncoder();
	const x = enc.encode(a);
	const y = enc.encode(b);
	if (x.length !== y.length) return false;
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
	return diff === 0;
}

// Functions called by pg_cron or database triggers are deployed without JWT
// verification and check this shared secret instead (stored in Vault on the
// database side and as a function secret here).
export function isInternalCall(req: Request): boolean {
	const expected = Deno.env.get("INTERNAL_HOOK_SECRET");
	const given = req.headers.get("x-internal-secret");
	return !!expected && !!given && safeEqual(given, expected);
}
