"use client";

import { Alert, Button, HStack, Link, Spinner, Text } from "@chakra-ui/react";
import { Sparkles } from "lucide-react";
import { COVER_SOURCE_LABELS } from "@/lib/comicFormOptions";
import type { CoverAutofill } from "@/hooks/comics-sale/useCoverAutofill";

/** Status of the AI cover lookup, plus a button to run it again. */
export default function CoverAutofillBanner({ autofill }: { autofill: CoverAutofill }) {
	const { status, message, filledCount, matches, hasCover, busy } = autofill;
	if (!hasCover) return null;

	const rerun = (
		<Button size="xs" variant="outline" colorPalette="purple" disabled={busy} onClick={() => autofill.autofill()}>
			<Sparkles /> Auto-fill from cover
		</Button>
	);

	if (status === "analyzing") {
		return (
			<Alert.Root status="info" width="full">
				<Spinner size="sm" />
				<Alert.Description>Reading the cover and looking it up… this can take up to 20 seconds.</Alert.Description>
			</Alert.Root>
		);
	}

	if (status === "unrecognised") {
		return (
			<Alert.Root status="warning" width="full">
				<Alert.Indicator />
				<Alert.Description flex="1">
					Couldn&apos;t recognise this cover. Fill the fields manually or try the ✨ buttons.
				</Alert.Description>
				{rerun}
			</Alert.Root>
		);
	}

	if (status === "error") {
		return (
			<Alert.Root status="error" width="full">
				<Alert.Indicator />
				<Alert.Description flex="1">{message}</Alert.Description>
				{rerun}
			</Alert.Root>
		);
	}

	if (status === "done") {
		return (
			<Alert.Root status="success" width="full" flexWrap="wrap">
				<Alert.Indicator />
				<Alert.Description flex="1">
					{filledCount > 0
						? `Filled ${filledCount} field${filledCount === 1 ? "" : "s"} from the cover. Please check them.`
						: "Nothing new to fill: your fields already have values. Use ✨ to look up a single field."}
					{matches.length > 0 && (
						<HStack gap={2} mt={1} flexWrap="wrap">
							<Text fontSize="xs">Sources:</Text>
							{matches.map((m) => (
								<Link key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" fontSize="xs" colorPalette="teal">
									{COVER_SOURCE_LABELS[m.source]}
								</Link>
							))}
						</HStack>
					)}
					{message && (
						<Text fontSize="xs" mt={1}>
							{message}
						</Text>
					)}
				</Alert.Description>
				{rerun}
			</Alert.Root>
		);
	}

	// idle (e.g. edit page with its existing cover)
	return (
		<HStack width="full" justify="space-between">
			<Text fontSize="sm" color="fg.muted">
				{message ?? "Let AI fill empty fields from the cover."}
			</Text>
			{rerun}
		</HStack>
	);
}
