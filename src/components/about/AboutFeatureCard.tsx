"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import { Box, VStack, Heading, Text } from "@chakra-ui/react";

interface AboutFeatureCardProps {
	title: string;
	description: string;
	icon: string;
	items?: string[];
}

const AboutFeatureCard = ({ title, description, icon, items }: AboutFeatureCardProps) => {
	const bgColor = useColorModeValue("white", "gray.800");
	const borderColor = useColorModeValue("gray.200", "gray.700");
	const hoverBg = useColorModeValue("gray.50", "gray.700");
	const textColor = useColorModeValue("gray.600", "gray.300");

	return (
		<Box
			p={6}
			bg={bgColor}
			borderWidth="1px"
			borderColor={borderColor}
			borderRadius="lg"
			transition="all 0.3s"
			_hover={{
				transform: "translateY(-4px)",
				shadow: "lg",
				bg: hoverBg,
			}}
		>
			<VStack gap={4} align="flex-start">
				<Box fontSize="2xl" mb={2}>
					{icon}
				</Box>
				<Heading size="md" fontFamily="Bangers" letterSpacing="wide">
					{title}
				</Heading>
				<Text color={textColor}>{description}</Text>
				{items && items.length > 0 && (
					<Box w="100%">
						<VStack align="flex-start" gap={2}>
							{items.map((item, index) => (
								<Text key={index} color={textColor} fontSize="sm">
									• {item}
								</Text>
							))}
						</VStack>
					</Box>
				)}
			</VStack>
		</Box>
	);
};

export default AboutFeatureCard;
