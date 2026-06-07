import React, { Suspense } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import ComicSuggestion from "./_components/ComicSuggestion.client";

export default function ComicSuggestionPage() {
	return (
		<Suspense
		>
			<ComicSuggestion />
		</Suspense>
	);
}
