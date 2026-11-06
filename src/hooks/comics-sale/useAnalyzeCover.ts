import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { CoverField, CoverSource } from "@/lib/comicFormOptions";

export type CoverValues = {
	title: string;
	publisher: string;
	genre: string;
	release_date: string;
	pages: number;
	main_artist: string;
	main_writer: string;
	description: string;
};

export type AnalyzeCoverRequest = {
	imageUrl: string;
	fields?: CoverField[];
	context?: Partial<CoverValues>;
};

export type AnalyzeCoverResult = {
	recognised: boolean;
	confidence: number;
	values: Partial<CoverValues>;
	sources: Partial<Record<CoverField, CoverSource>>;
	matches: Array<{ source: Exclude<CoverSource, "ai">; url: string }>;
	/** Databases whose facts the AI used to write the collector description. */
	descriptionFrom?: Array<Exclude<CoverSource, "ai">>;
};

const FRIENDLY: Record<number, string> = {
	401: "Your session expired. Please log in again to use the AI lookup.",
	429: "Too many AI lookups. Please try again in an hour.",
	503: "The AI is busy right now. Please try again in a moment.",
};

async function analyzeCover(body: AnalyzeCoverRequest): Promise<AnalyzeCoverResult> {
	// The browser client attaches the logged-in user's JWT; the function
	// (supabase/functions/analyze-cover) runs with verify_jwt = true.
	const { data, error } = await createClient().functions.invoke<AnalyzeCoverResult>("analyze-cover", { body });

	if (error) {
		const response = (error as { context?: Response }).context;
		const status = response?.status ?? 0;
		const message = await response
			?.json()
			.then((b: { error?: string }) => b?.error)
			.catch(() => undefined);
		throw new Error(FRIENDLY[status] ?? message ?? "The AI lookup failed. You can still fill the fields manually.");
	}
	if (!data) throw new Error("The AI lookup returned nothing.");
	return data;
}

export function useAnalyzeCover() {
	return useMutation({ mutationFn: analyzeCover });
}
