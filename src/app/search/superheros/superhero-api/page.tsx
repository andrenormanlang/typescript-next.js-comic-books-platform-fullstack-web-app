"use client";

import { useEffect, Suspense } from "react";
import { SimpleGrid, Box, Image, Text, Container, Center, Spinner } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import NextLink from "next/link";
import type { NextPage } from "next";
import SearchBox from "@/components/SearchBox";
import { useDebouncedCallback } from "use-debounce";
import { useRouter } from "next/navigation";
import { useGetSuperheroes } from "@/hooks/superhero-api/useGetSuperhero";
import { useSearchParameters } from "@/hooks/useSearchParameters";
import type { Superheroes } from "@/types/superheroes.types";
import ComicsPagination from "@/components/ComicsPagination";
import { Superhero } from "@/types/superhero.types";

const Superheroes: NextPage = () => {
	const pageSize = 16;
	const router = useRouter();

	const { searchTerm, setSearchTerm, currentPage, setCurrentPage } = useSearchParameters(1, "");

	const { data, isLoading, isError, error } = useGetSuperheroes(searchTerm, currentPage, pageSize);

	const handleSearchTerm = useDebouncedCallback((value: string) => {
		setSearchTerm(value);
		setCurrentPage(1);
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

	const isSearchMode = data && data.superheroes && data.superheroes.results?.length > 0;

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

	console.log('data', data);
	return (
		<Suspense>
			<Container maxW="container.xl" centerContent p={4}>
				<SearchBox onSearch={handleSearchTerm} />
				{data && (
					<Box>
						<Text fontSize="1.5em" mb={4} textAlign="center">
  {searchTerm
    ? `You have ${data.superheroes.length} results for "${searchTerm}"`
    : `You have a total of ${data.totalCount} heroes from the Superheroes API in ${data.totalPages} pages`}
</Text>
					</Box>
				)}
				<SimpleGrid columns={{ base: 1, md: 2 }} gap={30} width="100%">
					{data &&
						(isSearchMode
							? data.superheroes.results
								? data.superheroes.results.map((hero: Superhero) => (
										<NextLink
											href={`/search/superheros/superhero-api/${hero.id}`}
											passHref
											key={hero.id}
										>
											<Box alignContent="center">
												<motion.div
													whileHover={{
														scale: 1.05,
													}}
												>
													<Box
														boxShadow="0 4px 8px rgba(0,0,0,0.1)"
														rounded="sm"
														overflow="hidden"
														p={4}
														display="flex"
														flexDirection="column"
														alignItems="center"
														justifyContent="space-between"
														minH="500px"
														minW="300px"
													>
														<Image
															src={hero.image.url}
															alt={hero.name}
															maxW="300px"
															maxH="300px"
															objectFit="contain"
														/>
														<Text
															fontWeight="bold"
															fontSize="1.5rem"
															lineClamp={1}
															textAlign="center"
														>
															{hero.name}
														</Text>
														<Text
															fontWeight="bold"
															fontSize="1.2rem"
															lineClamp={1}
															textAlign="center"
														>
															first appearance: {hero.biography["first-appearance"]}
														</Text>
														<Text
															fontWeight="bold"
															fontSize="1.2rem"
															lineClamp={1}
															textAlign="center"
														>
															publisher: {hero.biography.publisher}
														</Text>
														{/* Display other hero details as needed */}
													</Box>
												</motion.div>
											</Box>
										</NextLink>
								  ))
								: null
							: data &&
							  Array.isArray(data.superheroes) &&
							  data.superheroes.map((hero: Superheroes) => (
									<NextLink
										href={`/search/superheros/superhero-api/${hero.id}?page=${currentPage}&query=${searchTerm}`}
										passHref
										key={hero.id}
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
												minH="500px"
												minW="300px"
											>
												<Image
													src={hero.images.lg}
													alt={hero.name}
													maxW="300px"
													maxH="300px"
													objectFit="contain"
												/>
												<Text
													fontWeight="bold"
													fontSize="1.5rem"
													lineClamp={1}
													textAlign="center"
												>
													{hero.name}
												</Text>
												<Text
													fontWeight="bold"
													fontSize="1.2rem"
													lineClamp={1}
													textAlign="center"
												>
													first appearance: {hero.biography.firstAppearance}
												</Text>
												<Text
													fontWeight="bold"
													fontSize="1.2rem"
													lineClamp={1}
													textAlign="center"
												>
													publisher: {hero.biography.publisher}
												</Text>
												{/* Display other hero details as needed */}
											</Box>
										</motion.div>
									</NextLink>
							  )))}
				</SimpleGrid>
				{!isSearchMode && (
					<ComicsPagination
						currentPage={currentPage}
						totalPages={data?.totalPages}
						onPageChange={(page) => {
							setCurrentPage(page);
							router.push(`/search/superhero-api?page=${page}`);
						}}
					/>
				)}
			</Container>
		</Suspense>
	);
};

export default Superheroes;
