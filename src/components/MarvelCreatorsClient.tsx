"use client";

import { useEffect, Suspense, useState } from "react";
import { SimpleGrid, Box, Image, Text, Container, Center, Spinner, Button, Flex, Tag } from "@chakra-ui/react";
import { motion } from "framer-motion";
import NextLink from "next/link";
import type { NextPage } from "next";
import SearchBox from "@/components/SearchBox";
import { useDebouncedCallback } from "use-debounce";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearchParameters } from "@/hooks/useSearchParameters";
import { MarvelComicsTypes } from "@/types/marvel/marvel-comics.type";
import MarvelPagination from "@/components/MarvelPagination";
import { useGetMarvelCreators } from "@/hooks/marvel/useGetMarvelCreators";
import { MarvelCreator, UrlItem } from "@/types/marvel/marvel-comic.type";

const FALLBACK_THUMBNAIL_URL = "https://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available/portrait_uncanny.jpg";

function buildThumbnailUrl(thumbnail?: { path?: string; extension?: string }) {
	if (!thumbnail?.path) {
		return FALLBACK_THUMBNAIL_URL;
	}

	const path = thumbnail.path.replace("http://", "https://");
	const extension = thumbnail.extension || "jpg";

	if (/\.(jpg|jpeg|png|webp|gif)$/i.test(path)) {
		return path;
	}

	return `${path}/portrait_uncanny.${extension}`;
}

const MarvelCreatorsClient: NextPage = () => {
	const pageSize = 18;
	const router = useRouter();
	const [searchParams, setSearchParams] = useSearchParams();

	const [totalPages, setTotalPages] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);

	const { searchTerm, setSearchTerm } = useSearchParameters(1, "");

	const { data, isLoading, isError, error } = useGetMarvelCreators(searchTerm, currentPage, pageSize);

	const handleSearchTerm = useDebouncedCallback((value: string) => {
		setSearchTerm(value);
		setCurrentPage(1); // Reset to page 1 whenever the search term changes
		// No need for the `newOffset` variable here since we are not passing `newPage`
	}, 500);

	// ... useEffect for updating URL parameters
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

	useEffect(() => {
		// Make sure searchParams is a URLSearchParams object
		const searchParams = new URLSearchParams(window.location.search);

		const page = parseInt(searchParams.get("page") || "1", 10);

		if (!isNaN(page) && page > 0) {
			setCurrentPage(page);
		} else {
			setCurrentPage(100);
		}
	}, []);
	const isSearchMode = data && data.results;

	useEffect(() => {
		if (data && data.data && data.data.total) {
			const pages = Math.ceil(data.data.total / pageSize);
			setTotalPages(pages);
			// If you're still on page 1 after search, you may want to call onPageChange(1) here to force a refetch
		}
	}, [data, pageSize]);

	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("page", currentPage.toString());
		if (searchTerm) {
			url.searchParams.set("query", searchTerm);
		} else {
			url.searchParams.delete("query");
		}
		const urlString = url.toString();
		router.push(urlString, undefined);
	}, [searchTerm, currentPage, router]);

	const onPageChange = (newPage: number) => {
		setCurrentPage(newPage);
		// const newOffset = (newPage - 1) * pageSize;
		// Now you need to refetch the data with the new offset.
		// This will depend on how your fetching logic is set up.
	};

	const getColorScheme = (type: string) => {
		switch (type) {
			case "detail":
				return "blue";
			default:
				return "gray";
		}
	};

	if (isLoading)
		return (
			<Center h="100vh">
				<Spinner size="xl" />
			</Center>
		);

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

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Container maxW="container.xl" centerContent p={4}>
				<SearchBox onSearch={(value) => handleSearchTerm(value)} />
				{data && data.data && (
					<Box>
						<Text fontSize="1.5em" mb={4} textAlign="center">
							{searchTerm
								? `You have ${data.data.total} results for "${searchTerm}" in ${Math.ceil(
										data.data.total / pageSize,
									)} pages`
								: `You have a total of ${data.data.total} creators in Marvel in ${Math.ceil(
										data.data.total / pageSize,
									)} pages`}
						</Text>
					</Box>
				)}
				<SimpleGrid columns={{ base: 1, md: 3 }} spacing={30} width="100%">
					{data.data &&
						Array.isArray(data.data.results) &&
						data.data.results.map((marvelCreator: MarvelCreator) => (
							<NextLink
								href={`/search/marvel/marvel-creators/${marvelCreator.id}?page=${currentPage}&query=${searchTerm}`}
								passHref
								key={marvelCreator.id}
							>
								<motion.div whileHover={{ scale: 1.05 }}>
									<Box
										boxShadow="0 4px 8px rgba(0,0,0,0.1)"
										rounded="sm"
										overflow="hidden"
										p={4}
										display="flex"
										flexDirection="column"
										alignItems="center"
										justifyContent="space-between"
										minH="380px"
										minW="350px"
									>
										<Image
											src={buildThumbnailUrl(marvelCreator.thumbnail)}
											alt={marvelCreator.fullName}
											fallbackSrc={FALLBACK_THUMBNAIL_URL}
											maxW="300px"
											maxH="300px"
											objectFit="contain"
										/>
										<Text mt={4} fontWeight="bold" fontSize="1rem" textAlign="center">
											{marvelCreator.fullName}
										</Text>
										<Text mt={2} fontSize="0.9rem" textAlign="center" noOfLines={2}>
											{marvelCreator.description || "No additional details available."}
										</Text>
										{/* Display the detail URL if available */}
										{/* <Flex wrap="wrap" mt={2}>
												{marvelCreator.urls.map(
													(urlItem: UrlItem) => (
														<Tag
															key={urlItem.type}
															colorScheme={getColorScheme(
																urlItem.type
															)}
															mr={2}
															mb={2}
														>
															<a
																href={
																	urlItem.url
																}
																target="_blank"
																rel="noopener noreferrer"
															>
																{urlItem.type
																	.charAt(0)
																	.toUpperCase() +
																	urlItem.type.slice(
																		1
																	)}
															</a>
														</Tag>
													)
												)}
											</Flex> */}
									</Box>
								</motion.div>
							</NextLink>
						))}
				</SimpleGrid>

				<MarvelPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
			</Container>
		</Suspense>
	);
};

export default MarvelCreatorsClient;
