import { assertEquals } from "jsr:@std/assert@1";
import { parseRates, SUPPORTED_CURRENCIES } from "./currency.ts";
import * as app from "../../../src/lib/currency.ts";

const BODY = {
	amount: 1,
	base: "EUR",
	date: "2026-11-05",
	rates: { BRL: 6.1355, DKK: 7.4747, GBP: 0.83393, NOK: 10.4365, SEK: 10.9845, USD: 1.1224 },
};

Deno.test("parses ECB rates, adding EUR = 1", () => {
	const rows = parseRates(BODY)!;
	assertEquals(rows.length, SUPPORTED_CURRENCIES.length);
	assertEquals(rows.find((r) => r.currency === "EUR"), { currency: "EUR", per_eur: 1, rate_date: "2026-11-05" });
	assertEquals(rows.find((r) => r.currency === "SEK")?.per_eur, 10.9845);
});

Deno.test("rejects partial or malformed responses", () => {
	assertEquals(parseRates({ ...BODY, rates: { ...BODY.rates, SEK: undefined } }), null);
	assertEquals(parseRates({ ...BODY, rates: { ...BODY.rates, USD: 0 } }), null);
	assertEquals(parseRates({ ...BODY, base: "USD" }), null);
	assertEquals(parseRates({ ...BODY, date: "yesterday" }), null);
	assertEquals(parseRates(null), null);
});

Deno.test("Edge Function currency list matches the app's", () => {
	assertEquals([...SUPPORTED_CURRENCIES], [...app.SUPPORTED_CURRENCIES]);
});

Deno.test("app conversion matches reserve_order's rounding", () => {
	const rates = { SEK: 10.9845, USD: 1.1224, EUR: 1, BRL: 6.1355 };
	assertEquals(app.convertPrice(50, "USD", "SEK", rates), 489.33); // same as the SQL test
	assertEquals(app.convertPrice(300, "SEK", "SEK", rates), 300);
	assertEquals(app.convertPrice(50, "BRL", "GBP", rates), null); // missing rate
	assertEquals(app.currencyForCountry("SE"), "SEK");
	assertEquals(app.currencyForCountry("de"), "EUR");
	assertEquals(app.currencyForCountry("JP"), "USD");
	assertEquals(app.currencyForCountry(null), "USD");
});
