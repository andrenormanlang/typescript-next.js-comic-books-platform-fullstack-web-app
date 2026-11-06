// Buyer currencies and ECB rate parsing for the sync-exchange-rates Edge Function.
// SUPPORTED_CURRENCIES is mirrored in src/lib/currency.ts (currency.test.ts
// checks the two copies match) and in reserve_order()
// (supabase/migrations/20261106100000_currency_conversion.sql).

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "SEK", "DKK", "NOK", "BRL"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type RateRow = { currency: Currency; per_eur: number; rate_date: string };

/**
 * frankfurter.dev response (base EUR) → one row per supported currency,
 * including EUR = 1. Returns null unless every currency has a sane rate, so a
 * partial or malformed response never overwrites good rates.
 */
export function parseRates(body: unknown): RateRow[] | null {
	const b = body as { base?: string; date?: string; rates?: Record<string, unknown> } | null;
	if (!b || b.base !== "EUR" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? "") || !b.rates) return null;

	const rows: RateRow[] = [];
	for (const currency of SUPPORTED_CURRENCIES) {
		const value = currency === "EUR" ? 1 : Number(b.rates[currency]);
		if (!Number.isFinite(value) || value <= 0) return null;
		rows.push({ currency, per_eur: value, rate_date: b.date! });
	}
	return rows;
}
