import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";
import { COVER_FIELDS, PUBLISHERS, type CoverField, type CoverSource } from "@/lib/comicFormOptions";
import { useAnalyzeCover, type AnalyzeCoverResult, type CoverValues } from "./useAnalyzeCover";

export type CoverAutofillStatus = "idle" | "analyzing" | "done" | "unrecognised" | "error";

/** Empty enough for auto-fill to replace: "", 0, NaN, an empty editor paragraph. */
function isEmpty(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "number") return !Number.isFinite(value) || value === 0;
	if (typeof value === "string") return value.replace(/<[^>]*>/g, "").trim() === "";
	return false;
}

/** Compare form values loosely (the editor rewrites HTML; inputs return strings). */
function same(a: unknown, b: unknown): boolean {
	const norm = (v: unknown) =>
		typeof v === "number" ? String(v) : String(v ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
	return norm(a) === norm(b);
}

/**
 * AI cover auto-fill for a react-hook-form listing form (sell + edit pages).
 *
 * - autofill(url): fills only fields that are empty, or still hold an earlier
 *   auto-filled value the seller hasn't changed. Never overwrites typed values.
 * - refreshField(field): looks one field up again and overwrites it, sending the
 *   seller's other values as context (a corrected title steers the lookup).
 * - sources: field → where its value came from; cleared once the seller edits it.
 */
export function useCoverAutofill<T extends FieldValues>(form: UseFormReturn<T>, imageUrl: string | null | undefined) {
	const { getValues, setValue, watch } = form;
	const analyze = useAnalyzeCover();

	const [status, setStatus] = useState<CoverAutofillStatus>("idle");
	const [message, setMessage] = useState<string | null>(null);
	const [pendingField, setPendingField] = useState<CoverField | null>(null);
	const [sources, setSources] = useState<Partial<Record<CoverField, CoverSource>>>({});
	const [matches, setMatches] = useState<AnalyzeCoverResult["matches"]>([]);
	const [filledCount, setFilledCount] = useState(0);
	const [extraPublisher, setExtraPublisher] = useState<string | null>(null);
	const [descriptionFrom, setDescriptionFrom] = useState<AnalyzeCoverResult["descriptionFrom"]>([]);
	const applied = useRef<Partial<CoverValues>>({});

	const read = useCallback((field: CoverField) => getValues(field as Path<T>) as unknown, [getValues]);
	const write = useCallback(
		(field: CoverField, value: unknown) =>
			setValue(field as Path<T>, value as PathValue<T, Path<T>>, { shouldValidate: true, shouldDirty: true }),
		[setValue],
	);

	// Drop a field's source badge once the seller changes what we filled in.
	useEffect(() => {
		const sub = watch((values) => {
			setSources((prev) => {
				let changed = false;
				const next = { ...prev };
				for (const field of Object.keys(prev) as CoverField[]) {
					if (!same((values as Record<string, unknown>)[field], applied.current[field])) {
						delete next[field];
						changed = true;
					}
				}
				return changed ? next : prev;
			});
		});
		return () => sub.unsubscribe();
	}, [watch]);

	const apply = useCallback(
		(result: AnalyzeCoverResult, mode: "fill-empty" | "overwrite", current: Partial<Record<CoverField, CoverSource>>) => {
			const nextSources = { ...current };
			let count = 0;
			for (const field of COVER_FIELDS) {
				const value = result.values[field];
				if (isEmpty(value)) continue;
				if (mode === "fill-empty" && !isEmpty(read(field)) && !current[field]) continue;

				if (field === "publisher" && typeof value === "string" && !PUBLISHERS.includes(value)) {
					setExtraPublisher(value); // add it to the dropdown before selecting it
				}
				applied.current[field] = value as never;
				write(field, value);
				nextSources[field] = result.sources[field] ?? "ai";
				count++;
			}
			setSources(nextSources);
			if (nextSources.description && result.values.description) setDescriptionFrom(result.descriptionFrom ?? []);
			return count;
		},
		[read, write],
	);

	const autofill = useCallback(
		async (url?: string) => {
			const cover = url ?? imageUrl;
			if (!cover) return;
			setStatus("analyzing");
			setMessage(null);
			try {
				const result = await analyze.mutateAsync({ imageUrl: cover });
				if (!result.recognised) {
					setStatus("unrecognised");
					return;
				}
				setFilledCount(apply(result, "fill-empty", sources));
				setMatches(result.matches);
				setStatus("done");
			} catch (err) {
				setStatus("error");
				setMessage((err as Error).message);
			}
		},
		[analyze, apply, imageUrl, sources],
	);

	const refreshField = useCallback(
		async (field: CoverField) => {
			if (!imageUrl) return;
			const context: Partial<CoverValues> = {};
			for (const f of COVER_FIELDS) {
				const v = read(f);
				if (f !== field && !isEmpty(v)) (context as Record<string, unknown>)[f] = v;
			}
			setPendingField(field);
			setMessage(null);
			try {
				const result = await analyze.mutateAsync({ imageUrl, fields: [field], context });
				if (isEmpty(result.values[field])) {
					setMessage(`No value found for ${field.replace("_", " ")}. You can type it in.`);
				} else {
					apply(result, "overwrite", sources);
					if (result.matches.length) setMatches(result.matches);
				}
			} catch (err) {
				setMessage((err as Error).message);
			} finally {
				setPendingField(null);
			}
		},
		[analyze, apply, imageUrl, read, sources],
	);

	return {
		autofill,
		refreshField,
		status,
		message,
		pendingField,
		sources,
		matches,
		filledCount,
		extraPublisher,
		descriptionFrom,
		hasCover: !!imageUrl,
		busy: status === "analyzing" || pendingField !== null,
	};
}

export type CoverAutofill = ReturnType<typeof useCoverAutofill>;
