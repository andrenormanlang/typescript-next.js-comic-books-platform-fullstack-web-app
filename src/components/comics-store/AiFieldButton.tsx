"use client";

import { Badge, HStack, IconButton, Spinner } from "@chakra-ui/react";
import { Sparkles } from "lucide-react";
import { COVER_SOURCE_LABELS, type CoverField } from "@/lib/comicFormOptions";
import type { CoverAutofill } from "@/hooks/comics-sale/useCoverAutofill";

type Props = {
	field: CoverField;
	label: string;
	autofill: CoverAutofill;
};

/**
 * Sits next to a field label: shows where the value came from (until the seller
 * edits it) and a ✨ button that looks just this field up again from the cover.
 */
export default function AiFieldButton({ field, label, autofill }: Props) {
	const source = autofill.sources[field];
	const loading = autofill.pendingField === field;
	const writtenFrom =
		field === "description" && source === "ai" && autofill.descriptionFrom?.length
			? `Written by AI from ${autofill.descriptionFrom.map((s) => COVER_SOURCE_LABELS[s]).join(", ")}`
			: null;
	const hint = autofill.hasCover ? `Look up ${label.toLowerCase()} from the cover` : "Upload a cover image first";

	return (
		<HStack gap={1}>
			{source && (
				<Badge
					size="xs"
					colorPalette={source === "ai" ? "purple" : "teal"}
					title={writtenFrom ?? `Filled from ${COVER_SOURCE_LABELS[source]}`}
				>
					{writtenFrom ? `AI · ${autofill.descriptionFrom!.map((s) => COVER_SOURCE_LABELS[s]).join(", ")}` : COVER_SOURCE_LABELS[source]}
				</Badge>
			)}
			<IconButton
				aria-label={hint}
				title={hint}
				size="2xs"
				variant="ghost"
				colorPalette="purple"
				disabled={!autofill.hasCover || autofill.busy}
				onClick={() => autofill.refreshField(field)}
			>
				{loading ? <Spinner size="xs" /> : <Sparkles />}
			</IconButton>
		</HStack>
	);
}
