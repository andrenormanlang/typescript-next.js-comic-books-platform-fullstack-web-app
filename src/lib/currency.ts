// Buyer currencies, conversion and formatting.
//
// Kept free of app imports so the Edge Function tests can import it:
// supabase/functions/_shared/currency.test.ts checks SUPPORTED_CURRENCIES and
// the rounding against reserve_order()
// (supabase/migrations/20261106100000_currency_conversion.sql).
//
// Prices shown in the store are estimates; the amount charged is always the
// one reserve_order() computes on the server.

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "SEK", "DKK", "NOK", "BRL"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "USD";

/** Cookie holding the visitor's currency (set by middleware.ts, changed by the navbar switcher). */
export const CURRENCY_COOKIE = "rp_currency";

/** Rates older than this aren't used (same limit as convert_price() in SQL). */
export const RATE_MAX_AGE_DAYS = 5;

export const CURRENCY_LABELS: Record<Currency, string> = {
	USD: "US Dollar",
	EUR: "Euro",
	GBP: "British Pound",
	SEK: "Swedish Krona",
	DKK: "Danish Krone",
	NOK: "Norwegian Krone",
	BRL: "Brazilian Real",
};

const EURO_COUNTRIES = [
	"AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT",
	"NL", "PT", "SI", "SK", "AD", "MC", "SM", "VA", "ME", "XK",
];

const COUNTRY_CURRENCY: Record<string, Currency> = {
	US: "USD",
	GB: "GBP",
	SE: "SEK",
	DK: "DKK",
	GL: "DKK",
	FO: "DKK",
	NO: "NOK",
	BR: "BRL",
	...Object.fromEntries(EURO_COUNTRIES.map((c) => [c, "EUR" as Currency])),
};

export function isCurrency(value: unknown): value is Currency {
	return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** ISO country code (e.g. from Vercel's x-vercel-ip-country header) → currency; USD otherwise. */
export function currencyForCountry(country: string | null | undefined): Currency {
	return COUNTRY_CURRENCY[(country ?? "").trim().toUpperCase()] ?? DEFAULT_CURRENCY;
}

/** Units of each currency per 1 EUR, as stored in public.exchange_rates. */
export type Rates = Partial<Record<string, number>>;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Same formula as convert_price() in SQL: amount / perEur[from] * perEur[to],
 * rounded to cents. Same currency → unchanged. Missing rate → null.
 */
export function convertPrice(amount: number, from: string, to: string, rates: Rates): number | null {
	const f = (from || DEFAULT_CURRENCY).toUpperCase();
	const t = to.toUpperCase();
	if (f === t) return round2(amount);
	const rf = rates[f];
	const rt = rates[t];
	if (!rf || !rt) return null;
	return round2((amount / rf) * rt);
}

/**
 * 300, "SEK" → "SEK 300.00". A fixed locale keeps server and browser output
 * identical (no hydration mismatch).
 */
export function formatPrice(amount: number, currency: string, locale = "en-US"): string {
	const code = (currency || DEFAULT_CURRENCY).toUpperCase();
	try {
		return new Intl.NumberFormat(locale, { style: "currency", currency: code, currencyDisplay: "code" }).format(amount);
	} catch {
		return `${amount.toFixed(2)} ${code}`;
	}
}
