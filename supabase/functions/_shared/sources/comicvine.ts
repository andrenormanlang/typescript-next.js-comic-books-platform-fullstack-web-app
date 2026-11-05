// Comic Vine. Broad coverage (incl. many foreign editions), so matching picks
// the series (volume) by name + publisher + start year before the issue.
// Comic Vine rejects requests without a User-Agent.

import { normalizePublisher } from "../comic-options.ts";
import { nameSimilarity, normalizeDate, pickBest, toDescription } from "../cover-text.ts";
import type { SourceAdapter } from "./types.ts";

const BASE = "https://comicvine.gamespot.com/api";
const USER_AGENT = "retro-pop-cover-lookup/1.0";

type CvVolume = {
	id: number;
	name: string;
	start_year?: string | null;
	count_of_issues?: number;
	publisher?: { name?: string } | null;
};
type CvIssue = {
	name?: string;
	issue_number?: string;
	cover_date?: string;
	description?: string;
	site_detail_url?: string;
	volume?: { id: number; name: string };
	person_credits?: Array<{ name: string; role: string }>;
};

function creditFor(issue: CvIssue, roles: string[]): string {
	for (const role of roles) {
		// Comic Vine roles are comma-separated, e.g. "writer, penciler".
		const hit = issue.person_credits?.find((c) => c.role.split(",").map((r) => r.trim().toLowerCase()).includes(role));
		if (hit) return hit.name;
	}
	return "";
}

export const comicvine: SourceAdapter = async (id, signal) => {
	const key = Deno.env.get("COMIC_VINE_API_KEY");
	if (!key || !id.series || !id.issue) return null;

	const get = async <T>(path: string, params: Record<string, string>): Promise<T | null> => {
		const qs = new URLSearchParams({ api_key: key, format: "json", ...params });
		const res = await fetch(`${BASE}/${path}?${qs}`, { headers: { "User-Agent": USER_AGENT }, signal });
		if (!res.ok) return null;
		const body = (await res.json()) as { status_code?: number; results?: T };
		return body.status_code === 1 ? (body.results ?? null) : null;
	};

	// 1. Find the series (volume). Issue search alone misses originals: for
	//    "Saga 1" it returns only the German edition, so pick the volume first,
	//    preferring the cover's publisher and a start year at or before the cover.
	const volumes = await get<CvVolume[]>("search/", {
		resources: "volume",
		query: id.series,
		limit: "20",
		field_list: "id,name,start_year,count_of_issues,publisher",
	});

	const wantedPublisher = normalizePublisher(id.publisher);
	const volume = pickBest(volumes ?? [], (v) => {
		const sim = nameSimilarity(v.name, id.series);
		if (sim < 0.75) return 0;
		if (v.count_of_issues && Number(id.issue) > v.count_of_issues) return 0;
		const start = Number(v.start_year) || null;
		if (start && id.year && start > id.year) return 0; // series began after this cover
		let score = sim * 10;
		const pub = normalizePublisher(v.publisher?.name);
		if (wantedPublisher && pub && (pub === wantedPublisher || nameSimilarity(pub, wantedPublisher) >= 0.5)) score += 5;
		if (start && id.year) score -= Math.min((id.year - start) * 0.1, 3); // long runs started earlier
		return score;
	});
	if (!volume) return null;

	// 2. That issue number inside the chosen volume.
	const found = await get<Array<{ id: number }>>("issues/", {
		filter: `volume:${volume.id},issue_number:${id.issue}`,
		field_list: "id",
		limit: "1",
	});
	const issueId = found?.[0]?.id;
	if (!issueId) return null;

	const issue = await get<CvIssue>(`issue/4000-${issueId}/`, {
		field_list: "name,issue_number,cover_date,description,site_detail_url,volume,person_credits",
	});
	if (!issue) return null;

	return {
		source: "comicvine",
		url: issue.site_detail_url ?? null,
		values: {
			title: issue.volume?.name && issue.issue_number ? `${issue.volume.name} #${issue.issue_number}` : "",
			publisher: normalizePublisher(volume.publisher?.name),
			release_date: normalizeDate(issue.cover_date),
			main_writer: creditFor(issue, ["writer"]),
			main_artist: creditFor(issue, ["penciler", "penciller", "artist"]),
			description: toDescription(issue.description),
		},
	};
};
