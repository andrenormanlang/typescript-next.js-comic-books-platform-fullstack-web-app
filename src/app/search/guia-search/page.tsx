"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
	Box,
	Button,
	Center,
	Container,
	Image,
	Input,
	SimpleGrid,
	Spinner,
	Stack,
	Text,
	useColorModeValue,
} from "@chakra-ui/react";
import ComicsPagination from "@/components/ComicsPagination";

type Result = {
	title: string;
	url: string;
	cover?: string;
	id?: string;
	editionNumber?: string;
	releaseDate?: string;
	provider?: string;
};

function extractEditionMeta(rawTitle: string) {
	const normalizedTitle = (rawTitle || "").replace(/Â°/g, "°").trim();
	const match = normalizedTitle.match(/n[°º]?\s*(\d+)\s*(.*)$/i);
	if (!match) return { editionNumber: "", editionDate: normalizedTitle };
	return { editionNumber: `#${match[1]}`, editionDate: (match[2] || "").trim() };
}

const GUIA_HOSTNAMES = ["www.guiadosquadrinhos.com", "guiadosquadrinhos.com"];

/**
 * The site's image server only speaks HTTP — normalize before proxying.
 */
function toHttpCoverUrl(url: string): string {
	return url.replace(/^https:\/\//i, "http://");
}

function proxiedCoverUrl(cover?: string): string {
	if (!cover) return "";
	try {
		const { hostname } = new URL(cover);
		if (GUIA_HOSTNAMES.includes(hostname.toLowerCase())) {
			// Always send http:// to proxy — proxy also normalizes, but belt-and-suspenders
			return `/api/image-proxy?url=${encodeURIComponent(toHttpCoverUrl(cover))}`;
		}
	} catch {
		/* not a valid URL */
	}
	return cover;
}

/**
 * Cover thumbnail.
 * Loads via /api/image-proxy which tries ScraperAPI → direct → allorigins → Jina.
 * If all fail the proxy returns 404 and onError shows the placeholder immediately
 * — no browser connection reset spinning.
 */
function CoverImage({ cover, title, subtleText }: { cover?: string; title: string; subtleText: string }) {
	const proxied = useMemo(() => proxiedCoverUrl(cover), [cover]);
	const [failed, setFailed] = useState(false);

	if (!proxied || failed) {
		return (
			<Center h="100%" color={subtleText} fontSize="xs">
				No image
			</Center>
		);
	}

	return <Image src={proxied} alt={title} w="100%" h="100%" objectFit="cover" onError={() => setFailed(true)} />;
}

export default function GuiaSearchPage() {
	const [query, setQuery] = useState("");
	const [lastQuery, setLastQuery] = useState("");
	const [page, setPage] = useState(1);
	const [results, setResults] = useState<Result[]>([]);
	const [hasMore, setHasMore] = useState(false);
	const [totalResults, setTotalResults] = useState(0);
	const [pageSize, setPageSize] = useState(0);
	const [searched, setSearched] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSearch = useMemo(() => query.trim().length > 0 && !loading, [query, loading]);
	const cardBg = useColorModeValue("white", "gray.800");
	const borderColor = useColorModeValue("gray.200", "gray.700");
	const subtleText = useColorModeValue("gray.600", "gray.400");
	const thumbBg = useColorModeValue("gray.100", "gray.700");

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
			const responseTotal = Number.parseInt(res.headers.get("X-Guia-Total-Results") || "0", 10) || 0;
			const responsePageSize = Number.parseInt(res.headers.get("X-Guia-Page-Size") || "0", 10) || 0;

			setResults(Array.isArray(data) ? data : []);
			setHasMore(responseHasMore);
			setTotalResults(responseTotal);
			setPageSize(responsePageSize);
			setPage(pageToFetch);
			setLastQuery(queryToSearch);
			setSearched(true);
		} catch (err: any) {
			setError(err?.message || "Unknown error");
			setResults([]);
			setHasMore(false);
			setTotalResults(0);
			setPageSize(0);
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

	const effectivePageSize = pageSize || (results.length > 0 ? results.length : 30);
	const computedTotalPages =
		totalResults > 0 ? Math.ceil(totalResults / Math.max(1, effectivePageSize)) : hasMore ? page + 1 : page;
	const totalPages = Math.max(page, computedTotalPages, hasMore ? page + 1 : 0);

	const handlePageChange = async (nextPage: number) => {
		if (!lastQuery || loading || nextPage === page || nextPage < 1) return;
		if (nextPage > totalPages && !hasMore) return;
		await fetchPage(lastQuery, nextPage);
	};

	return (
		<Container maxW="container.xl" py={6}>
			<Box mb={6}>
				{/* <Text fontSize="2xl" fontWeight="bold" mb={1}>
					Guia dos Quadrinhos Search
				</Text> */}
				<Text color={subtleText}>Search by (example: Incrível Hulk / Abril).</Text>
			</Box>

			<Box as="form" onSubmit={handleSearch} mb={6}>
				<Stack direction={{ base: "column", md: "row" }} spacing={3}>
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Try: wolverine or http://www.guiadosquadrinhos.com/capas/incrivel-hulk-o/hk00301"
					/>
					<Button type="submit" colorScheme="blue" isDisabled={!canSearch} minW={{ md: "140px" }}>
						{loading ? "Searching..." : "Search"}
					</Button>
				</Stack>
			</Box>

			{loading && (
				<Center py={6}>
					<Spinner size="lg" />
				</Center>
			)}

			{error && (
				<Box borderWidth="1px" borderColor="red.300" color="red.300" rounded="md" p={3} mb={4}>
					Error: {error}
				</Box>
			)}

			{searched && !loading && !error && (
				<Text mb={4} color={subtleText}>
					Page {page} • {totalResults || results.length} total results
				</Text>
			)}

			{searched && !loading && !error && results.length === 0 && (
				<Box borderWidth="1px" borderColor={borderColor} rounded="md" p={4} color={subtleText} mb={6}>
					No results found for this page.
				</Box>
			)}

			<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
				{results.map((r) => {
					const { editionNumber, editionDate } = extractEditionMeta(r.title);
					const displayIssueNumber = r.editionNumber || editionNumber || "Edição";
					const displayReleaseDate = r.releaseDate || editionDate || "Data não informada";
					return (
						<Box
							key={r.id || r.url}
							as="a"
							href={r.url}
							target="_blank"
							rel="noreferrer"
							bg={cardBg}
							borderWidth="1px"
							borderColor={borderColor}
							rounded="md"
							overflow="hidden"
							p={4}
							display="flex"
							gap={3}
						>
							<Box w="92px" h="132px" bg={thumbBg} flexShrink={0} rounded="md" overflow="hidden">
								<CoverImage cover={r.cover} title={r.title} subtleText={subtleText} />
							</Box>

							<Box minW={0} flex={1}>
								<Text fontWeight="bold" fontSize="lg" noOfLines={1}>
									{displayIssueNumber}
								</Text>
								<Text color={subtleText} mb={2} noOfLines={2}>
									{displayReleaseDate}
								</Text>
								{r.provider && (
									<Text fontSize="xs" color={subtleText} mt={2}>
										{r.provider}
									</Text>
								)}
							</Box>
						</Box>
					);
				})}
			</SimpleGrid>

			{searched && !loading && !error && (results.length > 0 || page > 1) && (
				<Box mt={8}>
					<ComicsPagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
				</Box>
			)}
		</Container>
	);
}
