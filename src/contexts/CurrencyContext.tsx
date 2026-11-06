"use client";

// The visitor's currency and the exchange rates used to show converted prices.
// The currency starts as the rp_currency cookie (set by middleware.ts from the
// visitor's country) and is changed with the navbar CurrencySwitcher. Rates
// come from public.exchange_rates, refreshed by the sync-exchange-rates Edge
// Function. Display only: checkout prices are converted by reserve_order().

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase/client";
import {
	convertPrice,
	CURRENCY_COOKIE,
	DEFAULT_CURRENCY,
	isCurrency,
	RATE_MAX_AGE_DAYS,
	type Currency,
	type Rates,
} from "@/lib/currency";

type CurrencyContextValue = {
	/** null until the cookie has been read after mount. */
	currency: Currency | null;
	setCurrency: (currency: Currency) => void;
	/** Date of the rates in use (YYYY-MM-DD), if any. */
	ratesDate: string | null;
	/** Price in the visitor's currency, or null if it can't be converted. */
	convert: (amount: number, from: string) => number | null;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readCookie(): Currency | null {
	const match = document.cookie.match(new RegExp(`(?:^|; )${CURRENCY_COOKIE}=([^;]*)`));
	const value = match ? decodeURIComponent(match[1]) : null;
	return isCurrency(value) ? value : null;
}

async function fetchRates(): Promise<{ rates: Rates; date: string | null }> {
	const { data, error } = await supabase.from("exchange_rates").select("currency, per_eur, rate_date");
	if (error) throw error;

	const oldest = new Date();
	oldest.setDate(oldest.getDate() - RATE_MAX_AGE_DAYS);
	const minDate = oldest.toISOString().slice(0, 10);

	const rates: Rates = {};
	let date: string | null = null;
	for (const row of data ?? []) {
		if (row.rate_date < minDate) continue; // stale: same rule as convert_price()
		rates[row.currency] = Number(row.per_eur);
		if (!date || row.rate_date > date) date = row.rate_date;
	}
	return { rates, date };
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
	const [currency, setCurrencyState] = useState<Currency | null>(null);

	useEffect(() => {
		setCurrencyState(readCookie() ?? DEFAULT_CURRENCY);
	}, []);

	const { data } = useQuery({
		queryKey: ["exchange-rates"],
		queryFn: fetchRates,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const setCurrency = useCallback((next: Currency) => {
		document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
		setCurrencyState(next);
	}, []);

	const convert = useCallback(
		(amount: number, from: string) => (currency ? convertPrice(amount, from, currency, data?.rates ?? {}) : null),
		[currency, data],
	);

	const value = useMemo(
		() => ({ currency, setCurrency, ratesDate: data?.date ?? null, convert }),
		[currency, setCurrency, data, convert],
	);

	return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
	const ctx = useContext(CurrencyContext);
	if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
	return ctx;
}
