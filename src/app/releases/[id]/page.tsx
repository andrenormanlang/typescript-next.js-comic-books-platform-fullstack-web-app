"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import { usePathname, useRouter } from "next/navigation";
import {Tag, 
	Box,
	Image,
	Text,
	VStack,
	Container, Heading,
	Button,
	Center,
	Spinner,
	SimpleGrid, Flex,
	HStack,
} from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import NextLink from "next/link";

const fetchIssue = async (id: string) => {
	const response = await fetch(`/api/releases/${id}`);
	if (!response.ok) {
		throw new Error("Failed to fetch issue details");
	}
	return response.json();
};

const IssuePage = () => {
	const router = useRouter();
	const pathname = usePathname();
	const id = pathname.split("/").pop();
	const bgColor = useColorModeValue("white", "gray.800");
	const borderColor = useColorModeValue("gray.200", "gray.700");

	const {
		data: issue,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["issue", id],
		queryFn: () => fetchIssue(id as string),
		enabled: !!id,
	});

	const formatDate = (dateString: string) => {
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "long",
			day: "numeric",
		};
		return new Date(dateString).toLocaleDateString(undefined, options);
	};

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
				<Text>Error loading issue details</Text>
			</Center>
		);
	}

	return (
		<Container maxW="1200px" p={4}>
			<Box mb={4}>
				<Button
					
					colorPalette="teal"
					variant="outline"
					onClick={() => router.push("/releases")}
				>
					Back to Releases
				</Button>
			</Box>

			<Flex direction={{ base: "column", md: "row" }} gap={8}>
				<VStack flex="1" align="start" gap={4}>
					<Box bg={bgColor} p={6} borderRadius="md" borderWidth="1px" borderColor={borderColor} w="100%">
							<Image
								src={issue.image}
								alt={`${issue.series.name} #${issue.number}`}

								objectFit="contain"
								maxH="700px"
								width="100%"
								mb={4}
							/>
							<HStack gap={4} wrap="wrap" mb={4}>
								<Tag.Root size="lg" colorPalette="blue">
									 {formatDate(issue.store_date)}
								</Tag.Root>
							</HStack>
							<Heading fontFamily="Bangers" letterSpacing="0.05em" color="tomato" size="xl">
								{issue.series.name} #{issue.number} Vol. {issue.series.volume}
							</Heading>


						<VStack align="start" gap={3}>
							<Text>
								<strong>Year Series Began:</strong> {issue.series.year_began}
							</Text>
							{issue.price && (
								<Text>
									<strong>Price:</strong> ${issue.price}
								</Text>
							)}
							{issue.desc && (
								<Box>
									<Text fontWeight="bold" mb={2}>
										Description:
									</Text>
									<Text>{issue.desc}</Text>
								</Box>
							)}
						</VStack>
					</Box>

					{issue.credits && issue.credits.length > 0 && (
						<Box bg={bgColor} p={6} borderRadius="md" borderWidth="1px" borderColor={borderColor} w="100%">
							<Heading size="md" mb={4}>
								Credits
							</Heading>
							<SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
								{issue.credits.map((credit: any) => (
									<Box key={credit.id}>
										<Text fontWeight="bold">{credit.creator}</Text>
										<Text>{credit.role.map((r: any) => r.name).join(", ")}</Text>
									</Box>
								))}
							</SimpleGrid>
						</Box>
					)}
				</VStack>
			</Flex>
		</Container>
	);
};

export default IssuePage;
