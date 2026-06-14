"use client";

import { Container, SimpleGrid, Box, Heading, Text, Image } from "@chakra-ui/react";
import AboutFeatureCard, { type AboutFeatureCardProps } from "./AboutFeatureCard";

// Conditional `{ base, _dark }` props resolve to a stable className on server and
// client, avoiding the hydration mismatch that `useColorModeValue` causes under SSR.
const headingColor = { base: "blue.600", _dark: "blue.300" };
const textColor = { base: "gray.600", _dark: "gray.300" };
const missionBg = { base: "blue.50", _dark: "blue.900" };

const features: AboutFeatureCardProps[] = [
	{
		title: "Comic Database Search",
		description: "Search issues, characters, and creators across multiple trusted sources.",
		icon: "🔍",
		items: [
			"Comic Vine — issues, characters & publishers",
			"Marvel — comics, creators & series",
			"Metron Cloud — community-driven issue data",
			"Superhero API — character profiles & stats",
			"Quadrinhos Brasil — Brazilian comics guide",
			"getcomics.org — browse the latest drops",
		],
	},
	{
		title: "AI Comic Recommendations",
		description: "Tell us your taste and let AI surface your next great read.",
		icon: "🤖",
		items: [
			"Personalized picks from your preferences",
			"Suggestions enriched with covers & details",
			"Discover hidden gems and deep cuts",
			"Powered by Google Gemini",
		],
	},
	{
		title: "Community & Blog",
		description: "Connect with fellow collectors and share your take.",
		icon: "💬",
		items: [
			"Discussion forums with topics & replies",
			"Community blog with a rich-text editor",
			"User profiles with custom avatars",
			"Reviews, opinions, and news pieces",
		],
	},
	{
		title: "Comic Marketplace",
		description: "Buy and sell comics with secure, hassle-free checkout.",
		icon: "🛒",
		items: [
			"Browse and buy from the store",
			"List your own comics to sell",
			"Cart & secure Stripe payments",
			"Order history & downloadable receipts",
		],
	},
	{
		title: "New Releases",
		description: "Keep up with what's hitting the shelves each week.",
		icon: "🆕",
		items: [
			"Weekly new release listings",
			"Detailed release pages with covers",
			"Never miss an upcoming drop",
		],
	},
	{
		title: "Comics News",
		description: "The latest headlines from across the comic world.",
		icon: "📰",
		items: [
			"Trending news feed",
			"Full in-app article reader",
			"Stay current with the industry",
		],
	},
];

export default function AboutContent() {
	return (
		<Box as="main" py={{ base: 20, md: 28 }}>
			<Container maxW="container.xl">
				{/* Hero Section */}
				<Box
					as="section"
					mb={20}
					display="flex"
					flexDirection={{ base: "column", md: "row" }}
					alignItems="center"
					gap={8}
				>
					<Box flex="1">
						<Heading
							as="h1"
							size="2xl"
							mb={6}
							fontFamily="Bangers"
							letterSpacing="wider"
							color={headingColor}
						>
							Welcome to Retro Pop Comics
						</Heading>
						<Text fontSize="xl" color={textColor} lineHeight="tall">
							Where the golden age of comics meets modern collecting! Search the biggest comic
							databases, get AI-powered recommendations, follow new releases and news, swap stories with
							the community, and shop &mdash; all in one place.
						</Text>
					</Box>
					<Box flex="1" position="relative" height={{ base: "300px", md: "400px" }} width="100%">
						<Image
							src="/halftone.png"
							alt=""
							aria-hidden="true"
							loading="lazy"
							objectFit="cover"
							borderRadius="1rem"
							w="100%"
							h="100%"
							// multiply darkens black dots onto the light page; in dark mode
							// invert the dots to white and screen (lighten) so they stay visible.
							mixBlendMode={{ base: "multiply", _dark: "screen" }}
							filter={{ base: "none", _dark: "invert(1)" }}
						/>
					</Box>
				</Box>

				{/* Features Grid */}
				<SimpleGrid as="section" columns={{ base: 1, md: 2 }} gap={{ base: 8, lg: 12 }} mb={20}>
					{features.map((feature) => (
						<AboutFeatureCard key={feature.title} {...feature} />
					))}
				</SimpleGrid>

				{/* Mission Statement */}
				<Box as="section" p={8} borderRadius="xl" bg={missionBg} textAlign="center">
					<Heading
						as="h2"
						size="lg"
						mb={4}
						fontFamily="Bangers"
						letterSpacing="wide"
						color={headingColor}
					>
						Our Mission
					</Heading>
					<Text fontSize="lg" color={textColor} maxW="3xl" mx="auto">
						At Retro Pop Comics, we&apos;re dedicated to creating the ultimate hub for comic book
						enthusiasts. We combine cutting-edge technology with a passion for comics to deliver an
						unmatched collecting and community experience.
					</Text>
				</Box>
			</Container>
		</Box>
	);
}
