"use client";

import { useEffect, useState } from "react";
import {
	SimpleGrid,
	Box,
	Image,
	Text,
	Container,
	Center,
	Spinner,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import SearchBox from "@/components/SearchBox";
import ComicsPagination from "@/components/ComicsPagination";
import MarvelPagination from "@/components/MarvelPagination";
import { useSearchParameters } from "@/hooks/useSearchParameters";
import { useGetMarvelCharacters } from "@/hooks/marvel/useGetMarvelCharacters";
import { MarvelCharacter } from "@/types/marvel/marvel-comic.type";

const MarvelCharactersClient = () => {
	const pageSize = 15;
	const router = useRouter();
	const [searchParams, setSearchParams] = useSearchParams();

	const [totalPages, setTotalPages] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);

	const { searchTerm, setSearchTerm } = useSearchParameters(1, "");

	const { data, isLoading, isError, error } = useGetMarvelCharacters(
		searchTerm,
		currentPage,
		pageSize
	);

	const handleSearchTerm = useDebouncedCallback((value: string) => {
		setSearchTerm(value);
		setCurrentPage(1); // Reset to page 1 whenever the search term changes
	}, 500);

	// Update URL parameters when searchTerm or currentPage changes
	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("page", currentPage.toString());
		if (searchTerm) {
			url.searchParams.set("query", searchTerm);
		} else {
			url.searchParams.delete("query");
		}
		router.push(url.toString(), undefined);
	}, [searchTerm, currentPage, router]);

	// Initialize currentPage from URL on mount
	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const page = parseInt(searchParams.get("page") || "1", 10);
		if (!isNaN(page) && page > 0) {
			setCurrentPage(page);
		}
	}, []);

	// Set totalPages based on data
	useEffect(() => {
		if (data && data.data && data.data.total) {
			const pages = Math.ceil(data.data.total / pageSize);
			setTotalPages(pages);
		}
	}, [data, pageSize]);

	const onPageChange = (newPage: number) => {
		setCurrentPage(newPage);
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
				Error: {error.message}
			</div>
		);
	}

	return (
		<Container maxW="container.xl" centerContent p={4}>
			<SearchBox onSearch={(value) => handleSearchTerm(value)} />
			{data && data.data && (
				<Box>
					<Text fontSize="1.5em" mb={4} textAlign="center">
						{searchTerm
							? `You have ${data.data.total} results for "${searchTerm}" in ${Math.ceil(
									data.data.total / pageSize
							  )} pages`
							: `You have a total of ${data.data.total} Marvel characters in ${Math.ceil(
									data.data.total / pageSize
							  )} pages`}
					</Text>
				</Box>
			)}
			<SimpleGrid columns={{ base: 1, md: 3 }} gap={30} width="100%">
				{data.data &&
					Array.isArray(data.data.results) &&
					data.data.results.map((marvelCharacter: MarvelCharacter) => (
						<NextLink
							href={`/search/marvel/marvel-characters/${marvelCharacter.id}?page=${currentPage}&query=${searchTerm}`}
							passHref
							key={marvelCharacter.id}
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
									minH="300px"
									minW="300px"
									cursor="pointer"
								>
									<Image
										src={`${marvelCharacter.thumbnail.path}/portrait_uncanny.${marvelCharacter.thumbnail.extension}`}
										alt={marvelCharacter.name}
										maxW="300px"
										maxH="300px"
										objectFit="contain"
									/>
									<Text mt={4} fontWeight="bold" fontSize="1rem" textAlign="center">
										{marvelCharacter.name}
									</Text>
								</Box>
							</motion.div>
						</NextLink>
					))}
			</SimpleGrid>

			<MarvelPagination
				currentPage={currentPage}
				totalPages={totalPages}
				onPageChange={onPageChange}
			/>
		</Container>
	);
};

export default MarvelCharactersClient;
