"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
	Box,
	Button,
	Container,
	Heading,
	Image,
	SimpleGrid,
	Spinner,
	Stack,
	Text,
	useColorModeValue,
} from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";

type GuiaEditionResult = {
	title?: string;
	url?: string;
	cover?: string;
	id?: string;
	editionNumber?: string;
	releaseDate?: string;
	provider?: string;
	editora?: string;
	licenciador?: string;
	categoria?: string;
	numeroPaginas?: string;
	formato?: string;
	precoCapa?: string;
	stories?: Array<{
		title?: string;
		description?: string;
		personagens?: string;
		roteiro?: string;
		desenho?: string;
		arteFinal?: string;
		cores?: string;
		letrista?: string;
		tradutor?: string;
		editorOriginal?: string;
		publicadaPrimeiraVez?: string;
	}>;
};

const GUIA_HOSTNAMES = ["www.guiadosquadrinhos.com", "guiadosquadrinhos.com"];

function toHttpCoverUrl(url: string): string {
	return url.replace(/^https:\/\//i, "http://");
}

function proxiedCoverUrl(cover?: string): string {
	if (!cover) return "";
	try {
		const absCover = /^https?:\/\//i.test(cover)
			? cover
			: `http://www.guiadosquadrinhos.com${cover.startsWith("/") ? "" : "/"}${cover}`;
		const { hostname } = new URL(absCover);
		if (GUIA_HOSTNAMES.includes(hostname.toLowerCase())) {
			return `/api/image-proxy?url=${encodeURIComponent(toHttpCoverUrl(absCover))}`;
		}
	} catch {
		return cover;
	}
	return cover;
}

export default function GuiaEditionPage() {
	const searchParams = useSearchParams();
	const sourceUrl = useMemo(() => searchParams.get("url") || "", [searchParams]);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [edition, setEdition] = useState<GuiaEditionResult | null>(null);

	const cardBg = useColorModeValue("white", "gray.800");
	const borderColor = useColorModeValue("gray.200", "gray.700");
	const subtleText = useColorModeValue("gray.600", "gray.400");

	useEffect(() => {
		let cancelled = false;

		async function loadEdition() {
			if (!sourceUrl) {
				if (!cancelled) {
					setError("Missing edition URL. Please open this page from a search result thumbnail.");
					setLoading(false);
				}
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const res = await fetch(`/api/guia-search?query=${encodeURIComponent(sourceUrl)}&page=1`, {
					cache: "no-store",
				});
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`);
				}

				const data = (await res.json()) as GuiaEditionResult[];
				const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
				if (!first) throw new Error("No edition details found.");

				if (!cancelled) setEdition(first);
			} catch (err: any) {
				if (!cancelled) setError(err?.message || "Failed to load edition details.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		loadEdition();
		return () => {
			cancelled = true;
		};
	}, [sourceUrl]);

	if (loading) {
		return (
			<Container maxW="container.lg" py={8}>
				<Stack align="center" py={10}>
					<Spinner size="lg" />
					<Text color={subtleText}>Loading edition details...</Text>
				</Stack>
			</Container>
		);
	}

	if (error || !edition) {
		return (
			<Container maxW="container.lg" py={8}>
				<Box borderWidth="1px" borderColor="red.300" rounded="md" p={4} color="red.300">
					{error || "No data available."}
				</Box>
				<Button as={Link} href="/search/guia-search" mt={4}>
					Back to search
				</Button>
			</Container>
		);
	}

	const cover = proxiedCoverUrl(edition.cover);

	return (
		<Container maxW="container.lg" py={8}>
			<Stack spacing={6}>
				<Heading size="lg">{edition.title || "Edição"}</Heading>

				<SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
					<Box bg={cardBg} borderWidth="1px" borderColor={borderColor} rounded="md" p={4}>
						{cover ? (
							<Image src={cover} alt={edition.title || "Edição"} w="100%" maxW="360px" rounded="md" />
						) : (
							<Box color={subtleText}>No cover image available.</Box>
						)}
					</Box>

					<Box bg={cardBg} borderWidth="1px" borderColor={borderColor} rounded="md" p={4}>
						<Stack spacing={2}>
							<Text>
								<strong>Edição:</strong> {edition.editionNumber || "-"}
							</Text>
							<Text>
								<strong>Publicado em:</strong> {edition.releaseDate || "-"}
							</Text>
							<Text>
								<strong>Editora:</strong> {edition.editora || "-"}
							</Text>
							<Text>
								<strong>Licenciador:</strong> {edition.licenciador || "-"}
							</Text>
							<Text>
								<strong>Categoria:</strong> {edition.categoria || "-"}
							</Text>
							<Text>
								<strong>Nº páginas:</strong> {edition.numeroPaginas || "-"}
							</Text>
							<Text>
								<strong>Formato:</strong> {edition.formato || "-"}
							</Text>
							<Text>
								<strong>Preço de capa:</strong> {edition.precoCapa || "-"}
							</Text>
							{edition.url && (
								<Button
									as="a"
									href={edition.url}
									target="_blank"
									rel="noreferrer"
									mt={2}
									size="sm"
									colorScheme="blue"
									variant="outline"
								>
									Open source page
								</Button>
							)}
						</Stack>
					</Box>
				</SimpleGrid>

				{edition.stories && edition.stories.length > 0 && (
					<Box bg={cardBg} borderWidth="1px" borderColor={borderColor} rounded="md" p={4}>
						<Heading size="md" mb={4}>
							Histórias
						</Heading>
						<Stack spacing={4}>
							{edition.stories.map((story, idx) => (
								<Box key={`${story.title || "story"}-${idx}`}>
									<Text fontWeight="bold">{story.title || `História ${idx + 1}`}</Text>
									{story.personagens && (
										<Text color={subtleText}>
											<strong>Personagens:</strong> {story.personagens}
										</Text>
									)}
									{story.roteiro && (
										<Text color={subtleText}>
											<strong>Roteiro:</strong> {story.roteiro}
										</Text>
									)}
									{story.desenho && (
										<Text color={subtleText}>
											<strong>Desenho:</strong> {story.desenho}
										</Text>
									)}
									{story.arteFinal && (
										<Text color={subtleText}>
											<strong>Arte-Final:</strong> {story.arteFinal}
										</Text>
									)}
									{story.cores && (
										<Text color={subtleText}>
											<strong>Cores:</strong> {story.cores}
										</Text>
									)}
									{story.letrista && (
										<Text color={subtleText}>
											<strong>Letrista:</strong> {story.letrista}
										</Text>
									)}
									{story.tradutor && (
										<Text color={subtleText}>
											<strong>Tradutor:</strong> {story.tradutor}
										</Text>
									)}
									{story.editorOriginal && (
										<Text color={subtleText}>
											<strong>Editor original:</strong> {story.editorOriginal}
										</Text>
									)}
									{story.publicadaPrimeiraVez && (
										<Text color={subtleText}>
											<strong>Publicada pela primeira vez em:</strong>{" "}
											{story.publicadaPrimeiraVez}
										</Text>
									)}
									{story.description ? (
										<Text color={subtleText}>{story.description}</Text>
									) : (
										<Text color={subtleText}>Sem descrição disponível.</Text>
									)}
								</Box>
							))}
						</Stack>
					</Box>
				)}

				<Button as={Link} href="/search/guia-search" w="fit-content">
					Back to search
				</Button>
			</Stack>
		</Container>
	);
}
