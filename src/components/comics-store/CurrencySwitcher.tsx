"use client";

import { NativeSelect } from "@chakra-ui/react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCY_LABELS, isCurrency, SUPPORTED_CURRENCIES } from "@/lib/currency";

// Navbar select for the currency prices are shown and charged in.
export default function CurrencySwitcher() {
	const { currency, setCurrency } = useCurrency();
	if (!currency) return null;

	return (
		<NativeSelect.Root size="sm" width="auto" ml={3}>
			<NativeSelect.Field
				aria-label="Currency"
				title="Currency for prices and checkout"
				value={currency}
				onChange={(e) => {
					if (isCurrency(e.target.value)) setCurrency(e.target.value);
				}}
				bg="gray.700"
				color="white"
				borderColor="whiteAlpha.300"
			>
				{SUPPORTED_CURRENCIES.map((c) => (
					<option key={c} value={c} style={{ color: "black" }}>
						{c} · {CURRENCY_LABELS[c]}
					</option>
				))}
			</NativeSelect.Field>
			<NativeSelect.Indicator color="white" />
		</NativeSelect.Root>
	);
}
