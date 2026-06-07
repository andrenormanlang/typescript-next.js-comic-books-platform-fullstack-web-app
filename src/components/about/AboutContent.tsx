"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import { Container, SimpleGrid, Box, Heading, Text, Image } from "@chakra-ui/react";
import AboutFeatureCard from "./AboutFeatureCard";

const features = [
	{
		title: "Comic Database Access",
		description: "Access comprehensive comic databases from multiple trusted sources",
		icon: "🔍",
		items: [
			"Comic Vine - Extensive issues and character database",
			"Marvel Comics API - Official Marvel content",
			"Metron Cloud - Professional comic grading",
			"Superhero API - Character information",
		],
	},
	{
		title: "AI-Powered Features",
		description: "Get personalized comic recommendations powered by advanced AI",
		icon: "🤖",
		items: [
			"Personalized comic suggestions",
			"Reading history analysis",
			"Interest-based recommendations",
			"Hidden gem discoveries",
		],
	},
	{
		title: "Community Features",
		description: "Join our vibrant community of comic enthusiasts",
		icon: "💫",
		items: [
			"Active discussion forums",
			"Latest news and reviews blog",
			"User profiles and collections",
			"Community recommendations",
		],
	},
	{
		title: "Shop Features",
		description: "Experience secure and convenient comic shopping",
		icon: "⚡",
		items: ["Digital marketplace", "New releases section", "Vintage collections", "Secure payment processing"],
	},
];

export default function AboutContent() {
	return (
		<Box as="main" py={{ base: 20, md: 28 }}>
			<Container maxW="container.xl">
				{/* Hero Section */}
				<Box mb={20} display="flex" flexDirection={{ base: "column", md: "row" }} alignItems="center" gap={8}>
					<Box flex="1">
						<Heading
							as="h1"
							size="2xl"
							mb={6}
							fontFamily="Bangers"
							letterSpacing="wider"
							color={useColorModeValue("blue.600", "blue.300")}
						>
							Welcome to Retro Pop Comics
						</Heading>
						<Text fontSize="xl" color={useColorModeValue("gray.600", "gray.300")} lineHeight="tall">
							Where the golden age of comics meets modern collecting! We&apos;re passionate about bringing
							you the finest selection of vintage and contemporary comic books, all in one convenient
							digital marketplace.
						</Text>
					</Box>
					<Box flex="1" position="relative" height={{ base: "300px", md: "400px" }} width="100%">
						<Image
							src="/halftone.png"
							alt="Retro Pop Comics Background"
							objectFit="cover"
							borderRadius="1rem"
							style={{
								mixBlendMode: "multiply",
							}}
							w="100%"
							h="100%"
						/>
					</Box>
				</Box>

				{/* Features Grid */}
				<SimpleGrid columns={{ base: 1, md: 2 }} gap={{ base: 8, lg: 12 }} mb={20}>
					{features.map((feature, index) => (
						<AboutFeatureCard key={index} {...feature} />
					))}
				</SimpleGrid>

				{/* Mission Statement */}
				<Box p={8} borderRadius="xl" bg={useColorModeValue("blue.50", "blue.900")} textAlign="center">
					<Heading
						as="h2"
						size="lg"
						mb={4}
						fontFamily="Bangers"
						letterSpacing="wide"
						color={useColorModeValue("blue.600", "blue.300")}
					>
						Our Mission
					</Heading>
					<Text fontSize="lg" color={useColorModeValue("gray.600", "gray.300")} maxW="3xl" mx="auto">
						At Retro Pop Comics, we&apos;re dedicated to creating the ultimate hub for comic book
						enthusiasts. We combine cutting-edge technology with a passion for comics to deliver an
						unmatched collecting and community experience.
					</Text>
				</Box>
			</Container>
		</Box>
	);
}
