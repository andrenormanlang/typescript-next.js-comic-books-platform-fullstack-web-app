// Refreshes public.exchange_rates from the European Central Bank (via
// frankfurter.dev, free, no key). Called by pg_cron twice a day
// (supabase/migrations/20261106100000_currency_conversion.sql).
// reserve_order() converts checkout prices with these rates and refuses rates
// older than 5 days, so a failing sync can't silently charge stale prices.

import { supabaseAdmin } from "../_shared/admin.ts";
import { isInternalCall, json } from "../_shared/http.ts";
import { parseRates, SUPPORTED_CURRENCIES } from "../_shared/currency.ts";

const SOURCE = "https://api.frankfurter.dev/v1/latest";

Deno.serve(async (req) => {
	if (!isInternalCall(req)) return json({ error: "Forbidden" }, 403);

	const symbols = SUPPORTED_CURRENCIES.filter((c) => c !== "EUR").join(",");
	let body: unknown;
	try {
		const res = await fetch(`${SOURCE}?base=EUR&symbols=${symbols}`, { signal: AbortSignal.timeout(10_000) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		body = await res.json();
	} catch (err) {
		console.error("Fetching rates failed:", err);
		return json({ error: "Rate source unavailable" }, 502);
	}

	const rows = parseRates(body);
	if (!rows) {
		console.error("Unexpected rate response:", JSON.stringify(body).slice(0, 500));
		return json({ error: "Unexpected rate response" }, 502);
	}

	const updatedAt = new Date().toISOString();
	const { error } = await supabaseAdmin
		.from("exchange_rates")
		.upsert(rows.map((r) => ({ ...r, updated_at: updatedAt })), { onConflict: "currency" });

	if (error) {
		console.error("Saving rates failed:", error);
		return json({ error: error.message }, 500);
	}

	console.log("sync-exchange-rates", rows[0].rate_date, rows.length);
	return json({ date: rows[0].rate_date, currencies: rows.length });
});
