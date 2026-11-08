"use client";

import { Button, Menu } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { ChevronDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCY_LABELS, isCurrency, SUPPORTED_CURRENCIES } from "@/lib/currency";

type CurrencySwitcherProps = {
	/** "field": styled like the store's search input; "default": plain outline button. */
	tone?: "field" | "default";
	size?: "sm" | "md";
};

// Compact currency picker: the button shows only the code ("SEK"), the open
// list shows the full names. Shown next to the store's search box and in the
// cart drawer; the choice is saved in the rp_currency cookie for the whole site.
export default function CurrencySwitcher({ tone = "default", size = "sm" }: CurrencySwitcherProps) {
	const { currency, setCurrency } = useCurrency();
	const fieldBg = useColorModeValue("white", "gray.700");
	const fieldBorder = useColorModeValue("gray.300", "gray.600");
	const fieldText = useColorModeValue("black", "white");
	if (!currency) return null;

	const field = tone === "field";

	return (
		<Menu.Root positioning={{ placement: "bottom-end" }}>
			<Menu.Trigger asChild>
				<Button
					size={size}
					variant="outline"
					flexShrink={0}
					aria-label={`Currency: ${CURRENCY_LABELS[currency]}. Change currency`}
					title="Currency for prices and checkout"
					bg={field ? fieldBg : undefined}
					color={field ? fieldText : undefined}
					borderColor={field ? fieldBorder : undefined}
					_hover={field ? { borderColor: "gray.500" } : undefined}
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
