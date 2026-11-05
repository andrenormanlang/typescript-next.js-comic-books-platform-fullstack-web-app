// Metron (metron.cloud). Same Basic auth as src/app/api/metron/metron-issues/route.ts.
// Best for US comics: one detail call has credits, cover date and page count.

import { clampPages, normalizePublisher } from "../comic-options.ts";
import { normalizeDate, pickBest, scoreCandidate, toDescription } from "../cover-text.ts";
import type { SourceAdapter } from "./types.ts";

const BASE = "https://metron.cloud/api";
const USER_AGENT = "retro-pop-cover-lookup/1.0";

type MetronListItem = { id: number; series: { name: string; year_began?: number }; number: string; cover_date?: string };
type MetronIssue = {
	id: number;
	publisher?: { name?: string };
	series?: { name?: string };
	number?: string;
	cover_date?: string;
	page?: number | null;
	desc?: string;
	resource_url?: string;
	credits?: Array<{ creator: string; role: Array<{ name: string }> }>;
};

function creditFor(issue: MetronIssue, roles: string[]): string {
	for (const role of roles) {
		const hit = issue.credits?.find((c) => c.role.some((r) => r.name.toLowerCase() === role));
		if (hit) return hit.creator;
	}
	return "";
}

export const metron: SourceAdapter = async (id, signal) => {
	const auth = Deno.env.get("METRON_API_AUTH_HEADER");
	if (!auth || !id.series || !id.issue) return null;

	const headers = { Authorization: `Basic ${auth}`, "User-Agent": USER_AGENT, Accept: "application/json" };
	const get = async <T>(url: string): Promise<T | null> => {
		const res = await fetch(url, { headers, signal });
		return res.ok ? ((await res.json()) as T) : null;
	};

	const params = new URLSearchParams({ series_name: id.series, number: id.issue });
	if (id.year) params.set("cover_year", String(id.year));
	let list = await get<{ results?: MetronListItem[] }>(`${BASE}/issue/?${params}`);

	// The cover year Gemini reads can be off by one; retry without it.
	if (id.year && !list?.results?.length) {
		params.delete("cover_year");
		list = await get<{ results?: MetronListItem[] }>(`${BASE}/issue/?${params}`);
	}

	const best = pickBest(list?.results ?? [], (r) =>
		scoreCandidate(
			{ name: r.series.name, issue: r.number, year: r.cover_date ? Number(r.cover_date.slice(0, 4)) : r.series.year_began },
			{ series: id.series, issue: id.issue, year: id.year },
		),
	);
	if (!best) return null;

	const issue = await get<MetronIssue>(`${BASE}/issue/${best.id}/`);
	if (!issue) return null;

	return {
		source: "metron",
		url: `https://metron.cloud/issue/${issue.id}/`,
		values: {
			title: issue.series?.name && issue.number ? `${issue.series.name} #${issue.number}` : "",
			publisher: normalizePublisher(issue.publisher?.name),
			release_date: normalizeDate(issue.cover_date),
			pages: clampPages(issue.page),
			main_writer: creditFor(issue, ["writer", "plotter", "script"]),
			main_artist: creditFor(issue, ["penciller", "artist", "pencils"]),
			description: toDescription(issue.desc),
		},
	};
};
