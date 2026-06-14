"use client";

import { Box, VStack, Heading, Text, List } from "@chakra-ui/react";

export interface AboutFeatureCardProps {
	title: string;
	description: string;
	icon: string;
	items?: string[];
}

// Colors are expressed as `{ base, _dark }` conditional props so they resolve to a
// single, stable className on both server and client (no hydration mismatch).
const textColor = { base: "gray.600", _dark: "gray.300" };

const AboutFeatureCard = ({ title, description, icon, items }: AboutFeatureCardProps) => {
	return (
		<Box
			as="article"
			p={6}
			bg={{ base: "white", _dark: "gray.800" }}
			borderWidth="1px"
			borderColor={{ base: "gray.200", _dark: "gray.700" }}
			borderRadius="lg"
			transition="all 0.3s"
			_hover={{
				transform: "translateY(-4px)",
				shadow: "lg",
				bg: { base: "gray.50", _dark: "gray.700" },
			}}
		>
			<VStack gap={4} align="flex-start">
				<Box as="span" fontSize="2xl" mb={2} aria-hidden="true">
					{icon}
				</Box>
				<Heading size="md" fontFamily="Bangers" letterSpacing="wide">
					{title}
				</Heading>
				<Text color={textColor}>{description}</Text>
				{items && items.length > 0 && (
					<List.Root w="100%" gap={2} color={textColor} fontSize="sm" ps={4} listStyleType="disc">
						{items.map((item) => (
							<List.Item key={item}>{item}</List.Item>
						))}
					</List.Root>
				)}
			</VStack>
		</Box>
	);
};

export default AboutFeatureCard;
