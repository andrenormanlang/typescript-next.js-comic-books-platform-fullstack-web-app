"use client";

import { useQuery } from "@tanstack/react-query";
import {
	SimpleGrid,
	Box,
	Image,
	Text,
	Container,
	Center,
	Spinner,
	Tabs,
	TabList,
	TabPanels,
	Tab,
	TabPanel,
	Heading,
	useColorModeValue,
	VStack,
	Badge,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParameters } from "@/hooks/useSearchParameters";
import { useDebouncedCallback } from "use-debounce";
import SearchBox from "@/components/SearchBox";
import MarvelPagination from "@/components/MarvelPagination";
import { useState, useEffect } from "react";
import { format } from "date-fns";

interface MetronIssue {
	id: number;
	series: {
		name: string;
		volume: number;
		year_began: number;
	};
	number: string;
	issue: string;
	cover_date: string;
	store_date: string;
	image: string;
	cover_hash: string;
}

interface MetronResponse {
	results: MetronIssue[];
	count: number;
	totalCount: number;
	recentCount: number;
	upcomingCount: number;
	totalPages: number;
	currentPage: number;
	pageSize: number;
	next: string | null;
	previous: string | null;
	view: ReleaseView;
}

type ReleaseView = "recent" | "upcoming";

interface FetchReleasesParams {
	page: number;
	pageSize: number;
	publisherName?: string;
	seriesName?: string;
	view: ReleaseView;
	query?: string;
}

const formatDate = (dateString: string) => {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	});
};

const fetchReleases = async ({ page, pageSize, publisherName, seriesName, view, query }: FetchReleasesParams) => {
	const url = new URL("/api/releases", window.location.origin);
	const searchParams = url.searchParams;

	searchParams.set("page", page.toString());
	searchParams.set("pageSize", pageSize.toString());
	searchParams.set("view", view);

	// Pass search query as series_name to match API parameter
	if (query) {
		searchParams.set("series_name", query);
	}
	if (publisherName) {
		searchParams.set("publisher_name", publisherName);
	}
	if (seriesName) {
		searchParams.set("series_name", seriesName);
	}

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error("Failed to fetch releases");
	}
	const data: MetronResponse = await response.json();
	return data;
};

const MetronReleasesClient = () => {
	const router = useRouter();
	const { searchTerm, setSearchTerm } = useSearchParameters(1, "");
	const [currentPage, setCurrentPage] = useState(1);
	const [activeView, setActiveView] = useState<ReleaseView>("recent");
	const pageSize = 20;
	const [publisherName, setPublisherName] = useState<string>();
	const [seriesName, setSeriesName] = useState<string>();

	// Color mode values
	const cardBg = useColorModeValue("white", "gray.800");
	const textColor = useColorModeValue("gray.800", "white");
	const mutedColor = useColorModeValue("gray.600", "gray.300");
	const borderColor = useColorModeValue("gray.200", "gray.700");

	// Read initial tab and page from URL on component mount
	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const view = searchParams.get("view") as ReleaseView;
		const page = parseInt(searchParams.get("page") || "1", 10);
		const query = searchParams.get("query") || "";

		if (view === "recent" || view === "upcoming") {
			setActiveView(view);
		}
		if (!isNaN(page) && page > 0) {
			setCurrentPage(page);
		}
		if (query) {
			setSearchTerm(query);
		}
	}, [setSearchTerm]);

	// Update URL when tab, page, or search changes
	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("view", activeView);
		url.searchParams.set("page", currentPage.toString());
		if (searchTerm) {
			url.searchParams.set("query", searchTerm);
		} else {
			url.searchParams.delete("query");
		}
		router.push(url.toString());
	}, [activeView, currentPage, searchTerm, router]);

	const { data, isLoading, error } = useQuery<MetronResponse>({
		queryKey: ["releases", currentPage, pageSize, publisherName, seriesName, activeView, searchTerm],
		queryFn: () =>
			fetchReleases({
				page: currentPage,
				pageSize,
				publisherName,
				seriesName,
				view: activeView,
				query: searchTerm,
			}),
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
	});

	const handleSearchTerm = useDebouncedCallback((value: string) => {
		setSearchTerm(value);
		setCurrentPage(1);
	}, 500);

	const handlePageChange = (page: number) => {
		if (!data?.totalPages) return;
		const validPage = Math.max(1, Math.min(page, data.totalPages));
		setCurrentPage(validPage);
		window.scrollTo(0, 0);
	};

	const handleTabChange = (index: number) => {
		const newView = index === 0 ? "recent" : "upcoming";
		setActiveView(newView);
		setCurrentPage(1); // Reset to first page when switching tabs
	};

	const getDateRangeText = (view: ReleaseView) => {
		const today = new Date();
		const thirtyDaysAgo = new Date(today);
		thirtyDaysAgo.setDate(today.getDate() - 30);
		const thirtyDaysAhead = new Date(today);
		thirtyDaysAhead.setDate(today.getDate() + 30);

		const formatDate = (date: Date) => {
			return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
		};

		if (view === "recent") {
			return `${formatDate(thirtyDaysAgo)} - ${formatDate(today)}`;
		} else {
			return `${formatDate(today)} - ${formatDate(thirtyDaysAhead)}`;
		}
	};

	const IssueGrid = ({ issues }: { issues: MetronIssue[] }) => (
		<SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
			{issues.map((issue) => (
				<NextLink key={issue.id} href={`/releases/${issue.id}`} passHref>
					<motion.div
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						style={{
							textDecoration: "none",
							cursor: "pointer",
							width: "100%",
						}}
					>
						<Box
							borderWidth="1px"
							borderRadius="lg"
							overflow="hidden"
							bg={cardBg}
							height="520px" // Increased height to accommodate 3 lines
							borderColor={borderColor}
							role="group"
							position="relative"
							_hover={{
								boxShadow: "lg",
								borderColor: "blue.400",
							}}
							transition="all 0.2s"
						>
							{/* Date Badge */}
							<Badge
								position="absolute"
								top="4"
								left="4"
								zIndex="1"
								bg="blackAlpha.800"
								color="purple.400"
								px="3"
								py="1"
								borderRadius="full"
								fontSize="sm"
							>
								{format(new Date(issue.store_date), "MMM d, yyyy")}
							</Badge>

							{/* Image Container */}
							<Box height="350px" overflow="hidden">
								<Image
									src={issue.image || "/default-image.webp"}
									alt={issue.issue}
									objectFit="cover"
									width="100%"
									height="100%"
									fallback={
										<Center height="100%">
											<Spinner />
										</Center>
									}
								/>
							</Box>

							{/* Content Container - Increased height */}
							<VStack p={4} align="center" spacing={2} height="170px" justify="center">
								<Heading
									size="md"
									color={textColor}
									noOfLines={3} // Allow up to 3 lines
									textAlign="center"
									lineHeight="1.2"
									minHeight="4.8em" // Ensure space for 3 lines + some padding
									display="-webkit-box"
									style={{
										WebkitLineClamp: 3,
										WebkitBoxOrient: "vertical",
										overflow: "hidden",
									}}
								>
									{issue.series.name}
								</Heading>
								<Text fontWeight="bold" color={textColor} fontSize="md">
									Issue #{issue.number}
								</Text>
								<Text fontSize="sm" color={mutedColor}>
									Series started: {issue.series.year_began}
								</Text>
							</VStack>
						</Box>
					</motion.div>
				</NextLink>
			))}
		</SimpleGrid>
	);

	if (isLoading) {
		return (
			<Center height="100vh">
				<Spinner size="xl" />
			</Center>
		);
	}

	if (error) {
		return (
			<Center height="100vh">
				<Text>Error loading releases</Text>
			</Center>
		);
	}

	return (
		<Container maxW="1200px" py={8}>
			<SearchBox onSearch={handleSearchTerm} />

			{data && (
				<Box mb={6}>
					<Text fontSize="2xl" textAlign="center" color={textColor} fontWeight="bold">
						{searchTerm
							? `Found ${data.count} results for "${searchTerm}"`
							: `${data.totalCount} Total Comics (${data.recentCount} Recent, ${data.upcomingCount} Upcoming)`}
					</Text>
					<Text fontSize="md" textAlign="center" color={mutedColor} mt={2}>
						{getDateRangeText(activeView)}
					</Text>
				</Box>
			)}

			<Tabs
				isFitted
				variant="enclosed"
				colorScheme="blue"
				index={activeView === "recent" ? 0 : 1}
				onChange={handleTabChange}
			>
				<TabList mb="1em">
					<Tab _selected={{ color: "blue.500", borderColor: "blue.500" }}>
						Recently Released ({data?.recentCount || 0})
					</Tab>
					<Tab _selected={{ color: "blue.500", borderColor: "blue.500" }}>
						Upcoming Releases ({data?.upcomingCount || 0})
					</Tab>
				</TabList>

				<TabPanels>
					<TabPanel>
						{activeView === "recent" &&
							(data?.results.length === 0 ? (
								<Center p={8}>
									<Text color={textColor}>No recent releases found</Text>
								</Center>
							) : (
								<IssueGrid issues={data?.results || []} />
							))}
					</TabPanel>
					<TabPanel>
						{activeView === "upcoming" &&
							(data?.results.length === 0 ? (
								<Center p={8}>
									<Text color={textColor}>No upcoming releases found</Text>
								</Center>
							) : (
								<IssueGrid issues={data?.results || []} />
							))}
					</TabPanel>
				</TabPanels>
			</Tabs>

			{data && data.count > pageSize && (
				<Box mt={8}>
					<MarvelPagination
						currentPage={data.currentPage}
						totalPages={data.totalPages}
						onPageChange={handlePageChange}
					/>
				</Box>
			)}
		</Container>
	);
};

export default MetronReleasesClient;
