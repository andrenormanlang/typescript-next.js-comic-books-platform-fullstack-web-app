"use client";

import React, { useCallback, useMemo, useState } from "react";

type Result = {
	title: string;
	url: string;
	cover?: string;
	id?: string;
	provider?: string;
};

export default function GuiaSearchPage() {
	const [query, setQuery] = useState("");
	const [lastQuery, setLastQuery] = useState("");
	const [page, setPage] = useState(1);
	const [results, setResults] = useState<Result[]>([]);
	const [hasMore, setHasMore] = useState(false);
	const [searched, setSearched] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSearch = useMemo(() => query.trim().length > 0 && !loading, [query, loading]);

	const fetchPage = useCallback(async (queryToSearch: string, pageToFetch: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/guia-search?query=${encodeURIComponent(queryToSearch)}&page=${pageToFetch}`);

			if (!res.ok) {
				let message = `HTTP ${res.status}`;
				try {
					const errJson = await res.json();
					message = errJson?.message || errJson?.error || message;
				} catch {
					const errText = await res.text();
					if (errText) message = errText;
				}
				throw new Error(message);
			}

			const data = (await res.json()) as Result[];
			const responseHasMore = (res.headers.get("X-Guia-Has-More") || "false").toLowerCase() === "true";

			setResults(Array.isArray(data) ? data : []);
			setHasMore(responseHasMore);
			setPage(pageToFetch);
			setLastQuery(queryToSearch);
			setSearched(true);
		} catch (err: any) {
			setError(err?.message || "Unknown error");
			setResults([]);
			setHasMore(false);
			setSearched(true);
		} finally {
			setLoading(false);
		}
	}, []);

	async function handleSearch(e?: React.FormEvent) {
		if (e) e.preventDefault();
		const normalized = query.trim();
		if (!normalized) return;
		await fetchPage(normalized, 1);
	}

	async function goToNextPage() {
		if (!lastQuery || loading || !hasMore) return;
		await fetchPage(lastQuery, page + 1);
	}

	async function goToPrevPage() {
		if (!lastQuery || loading || page <= 1) return;
		await fetchPage(lastQuery, page - 1);
	}

	return (
		<div className="max-w-5xl mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold">Guia dos Quadrinhos Search</h1>
				<p className="text-sm text-gray-500 mt-1">
					Search by keyword or paste a full `/capas/...` URL (example: Incrível Hulk / Abril).
				</p>
			</div>

			<form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
				<input
					className="flex-1 border rounded px-3 py-2"
					placeholder="Try: hulk or http://www.guiadosquadrinhos.com/capas/incrivel-hulk-o/hk00301"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
				<button
					type="submit"
					className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
					disabled={!canSearch}
				>
					{loading ? "Searching..." : "Search"}
				</button>
			</form>

			{searched && (
				<div className="flex items-center justify-between mb-4 text-sm">
					<div className="text-gray-600">
						Page {page} • {results.length} result{results.length === 1 ? "" : "s"}
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={goToPrevPage}
							disabled={loading || page <= 1}
							className="border px-3 py-1.5 rounded disabled:opacity-50"
						>
							Previous
						</button>
						<button
							type="button"
							onClick={goToNextPage}
							disabled={loading || !hasMore}
							className="border px-3 py-1.5 rounded disabled:opacity-50"
						>
							Next
						</button>
					</div>
				</div>
			)}

			{error && <div className="text-red-600 mb-4">Error: {error}</div>}

			{searched && !loading && !error && results.length === 0 && (
				<div className="border rounded p-4 text-gray-600">No results found for this page.</div>
			)}

			<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{results.map((r) => (
					<li key={r.id || r.url} className="border rounded overflow-hidden bg-white">
						<a href={r.url} target="_blank" rel="noreferrer" className="flex gap-3 p-3 items-center h-full">
							<div className="w-20 h-28 bg-gray-100 flex-shrink-0 overflow-hidden rounded">
								{r.cover ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img src={r.cover} alt={r.title} className="w-full h-full object-cover" />
								) : (
									<div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
										No image
									</div>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="font-semibold line-clamp-2">{r.title}</div>
								<div className="text-xs text-gray-500 break-all mt-1">{r.url}</div>
								{r.provider && <div className="text-xs text-gray-400 mt-2">{r.provider}</div>}
							</div>
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}
