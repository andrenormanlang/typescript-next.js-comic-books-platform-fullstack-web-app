"use client";

import { Button, Menu } from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCY_LABELS, isCurrency, SUPPORTED_CURRENCIES } from "@/lib/currency";

type CurrencySwitcherProps = {
	/** "navbar": light text on the dark navbar; "default": follows the colour mode. */
	tone?: "navbar" | "default";
};

// Compact currency picker: the button shows only the code ("SEK"), the open
// list shows the full names. Shown on store pages (navbar) and in the cart
// drawer; the choice is saved in the rp_currency cookie for the whole site.
export default function CurrencySwitcher({ tone = "default" }: CurrencySwitcherProps) {
	const { currency, setCurrency } = useCurrency();
	if (!currency) return null;

	const navbar = tone === "navbar";

	return (
		<Menu.Root positioning={{ placement: "bottom-end" }}>
			<Menu.Trigger asChild>
				<Button
					size="sm"
					variant="outline"
					aria-label={`Currency: ${CURRENCY_LABELS[currency]}. Change currency`}
					title="Currency for prices and checkout"
					color={navbar ? "white" : undefined}
					borderColor={navbar ? "whiteAlpha.400" : undefined}
					_hover={navbar ? { bg: "whiteAlpha.200" } : undefined}
				>
					{currency}
					<ChevronDown size={14} />
				</Button>
			</Menu.Trigger>
			<Menu.Positioner>
				<Menu.Content minW="200px">
					<Menu.RadioItemGroup
						value={currency}
						onValueChange={(e) => {
							if (isCurrency(e.value)) setCurrency(e.value);
						}}
					>
						{SUPPORTED_CURRENCIES.map((c) => (
							<Menu.RadioItem key={c} value={c}>
								{c} · {CURRENCY_LABELS[c]}
								<Menu.ItemIndicator />
							</Menu.RadioItem>
						))}
					</Menu.RadioItemGroup>
				</Menu.Content>
			</Menu.Positioner>
		</Menu.Root>
	);
}
