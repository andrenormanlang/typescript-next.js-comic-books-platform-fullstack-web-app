"use client";

// A listing price shown in the visitor's currency, with the seller's original
// price underneath (or in brackets) when they differ. The converted amount is
// an estimate ("≈"); checkout charges what reserve_order() computes.

import { Box, Text, type TextProps } from "@chakra-ui/react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice } from "@/lib/currency";

type PriceProps = TextProps & {
	amount: number;
	currency: string;
	/** "stacked": original on its own line; "inline": original in brackets. */
	layout?: "stacked" | "inline";
};

export default function Price({ amount, currency, layout = "stacked", ...textProps }: PriceProps) {
	const { currency: visitorCurrency, convert } = useCurrency();
	const original = formatPrice(Number(amount), currency);
	const differs = !!visitorCurrency && visitorCurrency !== (currency || "").toUpperCase();
	const converted = differs ? convert(Number(amount), currency) : null;

	if (converted === null || !visitorCurrency) {
		return <Text {...textProps}>{original}</Text>;
	}

	const main = `≈ ${formatPrice(converted, visitorCurrency)}`;

	if (layout === "inline") {
		return (
			<Text {...textProps} title={`Listed at ${original}`}>
				{main}{" "}
				<Text as="span" fontWeight="normal" opacity={0.7} fontSize="0.85em">
					({original})
				</Text>
			</Text>
		);
	}

	return (
		<Box title={`Listed at ${original}`}>
			<Text {...textProps}>{main}</Text>
			<Text fontSize="xs" opacity={0.7}>
				{original}
			</Text>
		</Box>
	);
}
