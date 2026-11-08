"use client";

import { useId } from "react";
import { Button, Menu } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { Tooltip } from "@/components/ui/tooltip";
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
	const { currency, setCurrency, ratesDate } = useCurrency();
	// Shared id so the tooltip and the menu attach to the same button.
	const triggerId = useId();
	const fieldBg = useColorModeValue("white", "gray.700");
	const fieldBorder = useColorModeValue("gray.300", "gray.600");
	const fieldText = useColorModeValue("black", "white");
	if (!currency) return null;

	const field = tone === "field";

	const help =
		`Prices are shown in ${CURRENCY_LABELS[currency]} (${currency}), converted from the seller's currency` +
		(ratesDate ? ` at European Central Bank rates of ${ratesDate}` : " at European Central Bank rates") +
		". You pay in this currency at checkout.";

	return (
		<Menu.Root ids={{ trigger: triggerId }} positioning={{ placement: "bottom-end" }}>
			<Tooltip
				ids={{ trigger: triggerId }}
				content={help}
				showArrow
				openDelay={300}
				contentProps={{ maxW: "280px" }}
				positioning={{ placement: "bottom" }}
			>
				<Menu.Trigger asChild>
					<Button
						size={size}
						variant="outline"
						flexShrink={0}
						aria-label={`Currency: ${CURRENCY_LABELS[currency]}. Change currency`}
						bg={field ? fieldBg : undefined}
						color={field ? fieldText : undefined}
						borderColor={field ? fieldBorder : undefined}
						_hover={field ? { borderColor: "gray.500" } : undefined}
					>
						{currency}
						<ChevronDown size={14} />
					</Button>
				</Menu.Trigger>
			</Tooltip>
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
