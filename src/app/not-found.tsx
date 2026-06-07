import { Box, Heading, Text, Button, Center, VStack } from "@chakra-ui/react";
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
	return (
		<Center h="100vh">
			<VStack gap={6}>
				<Image
					src="/toilet-not-found.jpg"
					alt="Toilet Not Found"
					width={300}
					height={300}
					style={{ borderRadius: 16 }}
				/>
				<Heading as="h1" size="2xl">
					404
				</Heading>
				<Text fontSize="xl">Page Not Found</Text>
				<Text>We couldn&apos;t find the page you were looking for.</Text>
				<Link href="/" passHref>
					<Button colorPalette="blue">Return Home</Button>
				</Link>
			</VStack>
		</Center>
	);
}
