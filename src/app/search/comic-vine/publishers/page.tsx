import React, { Suspense } from "react";
import ComicVinePublishersClient from "@/components/ComicVinePublishersClient";
import { Spinner, Center } from "@chakra-ui/react";

const ComicVinePublishers = () => {
  return (
    <Suspense
    >
      <ComicVinePublishersClient />
    </Suspense>
  );
};

export default ComicVinePublishers;




// "use client";

// import { useState, useEffect, Suspense } from "react";
// import {
// 	SimpleGrid,
// 	Box,
// 	Image,
// 	Text,
// 	Container,
// 	Center,
// 	Spinner,
// } from "@chakra-ui/react";
// import { motion } from "framer-motion";
// import NextLink from "next/link";
// import type { NextPage } from "next";
// import SearchBox from "@/components/SearchBox";
// import ComicsPagination from "@/components/ComicsPagination";
// import { useDebouncedCallback } from "use-debounce";
// import { htmlToText } from "html-to-text";
// import { useGetComicVineIssues } from "@/hooks/comic-vine/useComicVine";
// // @ts-ignore
// import {  Publishers, SearchQuery } from "@/types/comic.types";
// import { useRouter, usePathname, useSearchParams } from "next/navigation";
// import { useSearchParameters } from "@/hooks/useSearchParameters";
// import { useGetComicVinePublishers } from "@/hooks/comic-vine/useGetComicVinePublishers";

// const Publishers: NextPage = () => {
// 	const pageSize = 15;
// 	const maxDescriptionLength = 100;
// 	const {
// 		searchTerm,
// 		setSearchTerm,
// 		currentPage,
// 		setCurrentPage,
// 		updateUrl,
// 	} = useSearchParameters(1, "");

// 	const [searchQuery, setSearchQuery] = useState<SearchQuery>({
// 		page: 1,
// 		query: "",
// 	});

// 	const searchParams = useSearchParams();
// 	const pathname = usePathname();
// 	const router = useRouter();

// 	const { data, isLoading, isError, error } = useGetComicVinePublishers(
// 		searchTerm,
// 		currentPage,
// 		pageSize
// 	);

// 	const handlePageChange = (page: number) => {
// 		setCurrentPage(page);
// 		setSearchQuery({ ...searchQuery, page });
// 		updateUrl(searchTerm, page);
// 	};

// 	const handleSearchTerm = useDebouncedCallback((term: string) => {
// 		setSearchTerm(term);
// 		setCurrentPage(1);
// 		updateUrl(term, 1);
// 		setSearchQuery({ ...searchQuery, query: term, page: 1 });
// 	}, 300);

// 	useEffect(() => {
// 		const url = new URL(window.location.href);
// 		url.searchParams.set("page", currentPage.toString());
// 		if (searchTerm) {
// 			url.searchParams.set("query", searchTerm);
// 		} else {
// 			url.searchParams.delete("query");
// 		}
// 		// Convert URL object to a string
// 		const urlString = url.toString();
// 		router.push(urlString, undefined);
// 	}, [searchTerm, currentPage, router]);

// 	const validData = data?.results.slice(0);

// 	if (isLoading) {
// 		return (
// 			<Center h="100vh">
// 				<Spinner size="xl" />
// 			</Center>
// 		);
// 	}

// 	if (isError) {
// 		return (
// 			<div
// 				style={{
// 					display: "flex",
// 					justifyContent: "center",
// 					alignItems: "center",
// 					height: "100vh", // Full viewport height
// 					fontFamily: '"Bangers", cursive', // Assuming "Bangers" font is loaded
// 					fontSize: "1.5rem", // Larger font size
// 					color: "red", // Red color for the error message
// 					textAlign: "center",
// 					padding: "20px",
// 					backgroundColor: "#f0f0f0", // Light background for visibility
// 					borderRadius: "10px",
// 					boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)", // Optional shadow for better appearance
// 				}}
// 			>
// 				Error: {error.message}
// 			</div>
// 		);
// 	}

// 	console.log('data', data);

// 	return (
// 		<Suspense
//}
// 				>
// 					Loading...
// 				</div>
// 			}
// 		>
// 			<Container maxW="container.xl" centerContent p={4}>
// 				<SearchBox onSearch={handleSearchTerm} />
// 				{data && (
// 					<Box>
// 						<Text fontSize="1.5em" mb={4} textAlign="center">
// 							{searchTerm
// 								? `You have ${
// 										data.number_of_total_results
// 								  } results for "${searchTerm}" in ${Math.ceil(
// 										data.number_of_total_results /
// 											data.limit
// 								  )} pages`
// 								: `You have a total of ${
// 										data.number_of_total_results
// 								  } publishers in ${Math.ceil(
// 										data.number_of_total_results /
// 											data.limit
// 								  )} pages`}
// 						</Text>
// 					</Box>
// 				)}
// 				<SimpleGrid
// 					columns={{ base: 1, md: 3 }}
// 					gap={10}
// 					width="100%"
// 				>
// 					{validData?.map((publishers: Publishers) => {
// 						const plainDescription = htmlToText(
// 							publishers.deck || "",
// 							{
// 								wordwrap: 130,
// 							}
// 						);
// 						const truncatedDescription =
// 							plainDescription.length > maxDescriptionLength
// 								? plainDescription.substring(
// 										0,
// 										maxDescriptionLength
// 								  ) + "..."
// 								: plainDescription;

// 						return (
// 							<NextLink
// 								href={`/search/comic-vine/publishers/${publishers.id}?page=${currentPage}&query=${searchTerm}`}
// 								passHref
// 								key={publishers.id}
// 							>
// 								<motion.div
// 									whileHover={{ scale: 1.05 }}
// 									style={{
// 										textDecoration: "none",
// 										cursor: "pointer",
// 									}}
// 								>
// 									<Box
// 										boxShadow="0 4px 8px rgba(0,0,0,0.1)"
// 										rounded="md"
// 										overflow="hidden"
// 										p={4}
// 										display="flex"
// 										flexDirection="column"
// 										alignItems="center"
// 										justifyContent="space-between" // Distribute space between elements
// 										minH="350px" // Set a minimum height for the card
// 										position="relative"
// 									>
// 										<Image
// 											src={publishers.image.thumb_url}
// 											alt={
// 												publishers.name ||
// 												`Publisher ${publishers.id}`
// 											}
// 											maxW="200px"
// 											maxH="200px"
// 											objectFit="contain"
// 										/>
// 										<Text
// 											fontWeight="bold"
// 											fontSize="lg"
// 											color="red"
// 											lineClamp={1}
// 											textAlign="center"
// 											mt={4}
// 										>
// 											{publishers.name}
// 										</Text>

// 										<Text
// 											fontSize="sm"
// 											color="gray.500"
// 											textAlign="left"
// 											mt={2}
// 											p={4}
// 										>
// 											{truncatedDescription}
// 										</Text>
// 									</Box>
// 								</motion.div>
// 							</NextLink>
// 						);
// 					})}
// 				</SimpleGrid>
// 				<div style={{ marginTop: "2rem" }}>
// 					<ComicsPagination
// 						currentPage={currentPage}
// 						totalPages={Math.ceil(
// 							data.number_of_total_results / data.limit
// 						)}
// 						onPageChange={handlePageChange}
// 					/>
// 				</div>
// 			</Container>
// 		</Suspense>
// 	);
// };

// export default Publishers;
