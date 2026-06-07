"use client";

import { useState, useEffect, Suspense } from "react";
import { SimpleGrid, Box, Image, Text, Container, Center, Spinner, Button, VStack } from "@chakra-ui/react";
import { Download, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import NextLink from "next/link";
import type { NextPage } from "next";
import SearchBox from "@/components/SearchBox";
import { useDebouncedCallback } from "use-debounce";
import { SearchQuery } from "@/types/comic.types";
import { useRouter } from "next/navigation";
import { useSearchParameters } from "@/hooks/useSearchParameters";
import { useGetComicBooksApi } from "@/hooks/comicbooks-api/useGetComicBooksAPI";
import { ComicBooksAPI } from "@/types/cbAPI.types";

const CBAPI: NextPage = () => {
	const pageSize = 1;
	const { searchTerm, setSearchTerm, currentPage, setCurrentPage, updateUrl } = useSearchParameters(1, "");

	const [searchQuery, setSearchQuery] = useState<SearchQuery>({
		page: 1,
		query: "",
	});

	const getColorScheme = (serviceName: string): string => {
		const schemes: { [key: string]: string } = {
			DOWNLOADNOW: "blue",
			MEGA: "teal",
			VIKINGBOX: "yellow",
			TERABOX: "green",
			PIXELDRAIN: "orange",
			MEDIAFIRE: "red",
			READONLINE: "purple",
			// Add color schemes for part indicators
			PART1: "cyan",
			PART2: "cyan",
		};
		return schemes[serviceName] || "gray"; // Default color scheme if not found
	};

	const groupDownloadLinks = (links: { [key: string]: string }) => {
		const grouped: { [key: string]: { [key: string]: string } } = {};

		Object.entries(links).forEach(([key, value]) => {
			// Check if the key contains PART1 or PART2
			const partMatch = key.match(/(.*?)(PART[12])?$/);
			if (partMatch) {
				const baseName = partMatch[1] || key;
				const part = partMatch[2];

				if (!grouped[baseName]) {
					grouped[baseName] = {};
				}

				if (part) {
					grouped[baseName][part] = value;
				} else {
					grouped[baseName]["SINGLE"] = value;
				}
			}
		});

		return grouped;
	};

	const desiredButtons = ["DOWNLOADNOW", "MEGA", "MEDIAFIRE", "VIKINGBOX", "TERABOX", "PIXELDRAIN", "READONLINE"];

	const router = useRouter();

	const { data, isLoading, isError, error } = useGetComicBooksApi(searchTerm, currentPage, pageSize);

	const handleSearchTerm = useDebouncedCallback((term: string) => {
		setSearchTerm(term);
		setCurrentPage(1);
		updateUrl(term, 1);
		setSearchQuery({ ...searchQuery, query: term, page: 1 });
	}, 300);

	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("page", currentPage.toString());
		if (searchTerm) {
			url.searchParams.set("query", searchTerm);
		} else {
			url.searchParams.delete("query");
		}
		// Convert URL object to a string
		const urlString = url.toString();
		router.push(urlString, undefined);
	}, [searchTerm, currentPage, router]);

	if (isLoading) {
		return (
			<Center h="100vh">
				<Spinner size="xl" />
			</Center>
		);
	}

	if (isError) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh", // Full viewport height
					fontFamily: '"Bangers", cursive', // Assuming "Bangers" font is loaded
					fontSize: "1.5rem", // Larger font size
					color: "red", // Red color for the error message
					textAlign: "center",
					padding: "20px",
					backgroundColor: "#f0f0f0", // Light background for visibility
					borderRadius: "10px",
					boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)", // Optional shadow for better appearance
				}}
			>
				Error: {error.message}
			</div>
		);
	}

	console.log("data", data);

	return (
		<Suspense
			fallback={
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
						fontFamily: '"Bangers", cursive',
						fontSize: "1.5rem",
						color: "red",
						textAlign: "center",
						padding: "20px",
						backgroundColor: "#f0f0f0",
						borderRadius: "10px",
						boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
					}}
				>
					Loading...
				</div>
			}
		>
			<Container maxW="container.xl" centerContent p={4}>
				<SearchBox onSearch={handleSearchTerm} />
				<SimpleGrid columns={{ base: 1, md: 2 }} gap={10} width="100%">
					{data?.map((comic: ComicBooksAPI, index: number) => {
						return (
							<motion.div
								key={`${comic.id}-${index}`} // Ensures unique key
								whileHover={{ scale: 1.05 }}
								style={{
									textDecoration: "none",
									cursor: "pointer",
								}}
							>
								<Box
									boxShadow="0 4px 8px rgba(0,0,0,0.1)"
									rounded="md"
									overflow="hidden"
									p={4}
									display="flex"
									flexDirection="column"
									alignItems="center"
									justifyContent="space-between"
									minH="630px"
									position="relative"
								>
									<Image
										src={comic.coverPage}
										alt={comic.title || `Comic ${comic.title}`}
										maxW="400px"
										maxH="400px"
										objectFit="contain"
									/>
									<Text fontWeight="bold" fontSize="md" textAlign="center" mt={4}>
										{comic.title}
									</Text>
									<Text fontSize="sm" color="gray.500" textAlign="left" mt={1} p={2}>
										{comic.description}
									</Text>
									<VStack gap={4} align="stretch" mt={"1rem"}>
										{Object.entries(groupDownloadLinks(comic.downloadLinks)).map(
											([service, links]) => (
												<Box key={`${comic.id}-${service}`}>
													{Object.entries(links).length > 1 ? (
														<>
															<Text fontSize="sm" fontWeight="bold" mb={2}>
																{service}
															</Text>
															{Object.entries(links).map(([part, url]) => (
																<Button
																	asChild
																	key={`${comic.id}-${service}-${part}`}
																	colorPalette={getColorScheme(service)}
																	_hover={{ transform: "scale(1.05)" }}
																	aria-label={`Download ${service} ${part}`}
																	w="full"
																	mb={2}
																>
																	<a href={url} target="_blank" rel="noopener noreferrer">
																		{service} {part !== "SINGLE" ? part : ""}
																	</a>
																</Button>
															))}
														</>
													) : (
														<Button
															asChild
															key={`${comic.id}-${service}`}
															colorPalette={getColorScheme(service)}
															_hover={{ transform: "scale(1.05)" }}
															aria-label={`Download from ${service}`}
															w="full"
														>
															<a href={Object.values(links)[0]} target="_blank" rel="noopener noreferrer">
																{service}
															</a>
														</Button>
													)}
												</Box>
											)
										)}
									</VStack>
								</Box>
							</motion.div>
						);
					})}
				</SimpleGrid>
				<div style={{ marginTop: "2rem", display: "flex", justifyContent: "space-between" }}>
					<Button
						onClick={() => setCurrentPage(1)}
						disabled={currentPage === 1}
						style={{ marginRight: "1rem" }}
					>
						First
					</Button>

					<Button
						onClick={() => setCurrentPage(currentPage - 1)}
						style={{ marginLeft: "1rem", marginRight: "1rem" }}
						disabled={currentPage === 1} // Prevent going below page 1
					>
						Previous
					</Button>

					<Button onClick={() => setCurrentPage(currentPage + 1)} style={{ marginLeft: "1rem" }}>
						Next
					</Button>
				</div>
			</Container>
		</Suspense>
	);
};

export default CBAPI;
