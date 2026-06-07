"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {NativeSelect, 
	Box,
	Button,
	Input,
	Field,
	Heading,
	VStack, Text,
	Container,
	SimpleGrid,
	Flex,
	Icon,
	Card, Separator,
} from "@chakra-ui/react";
import { FaBook, FaPencilAlt, FaPaintBrush } from "react-icons/fa";
import { comicGenres, comicStyles, experienceLevels, purposes } from "@/lib/comicSuggestionOptions";

export default function ComicSuggestionForm() {
	const router = useRouter();
	const [formData, setFormData] = useState({
		age: "",
		genre: "",
		style: "",
		experience: "",
		purpose: "",
	});

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData({ ...formData, [name]: value });
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const params = new URLSearchParams();
		if (formData.genre) params.append("genre", formData.genre);
		if (formData.style) params.append("style", formData.style);
		if (formData.experience) params.append("experience", formData.experience);
		if (formData.purpose) params.append("purpose", formData.purpose);
		if (formData.age) params.append("age", formData.age);
		// Navigate to the comic suggestion page with query parameters
		router.push(`/comic-suggestion?${params.toString()}`);
	};

	return (
		<Container maxW="800px" py={8}>
			<Card.Root boxShadow="lg" borderRadius="lg" overflow="hidden">
				<Card.Body>
					<Text mb={6} textAlign="center">
						Fill out this form to receive AI-powered comic recommendations tailored to your preferences.
					</Text>
					<Separator mb={6} />

					<form onSubmit={handleSubmit}>
						<SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
							<VStack gap={4} align="stretch">
								<Flex align="center" mb={2}>
									<Icon as={FaBook} color="blue.500" mr={2} />
									<Heading as="h3" size="md">
										Personal Info
									</Heading>
								</Flex>

								<Field.Root id="age" required>
									<Field.Label>Age</Field.Label>
									<Input type="number" name="age" value={formData.age} onChange={handleChange} />
								</Field.Root>

								<Field.Root id="experience">
									<Field.Label>Your Comic Experience</Field.Label>
									<NativeSelect.Root><NativeSelect.Field
										name="experience"
										value={formData.experience}
										onChange={handleChange}
										placeholder="Select your experience level"
									>
										{experienceLevels.map((level) => (
											<option key={level} value={level}>
												{level}
											</option>
										))}
									</NativeSelect.Field></NativeSelect.Root>
								</Field.Root>
							</VStack>

							<VStack gap={4} align="stretch">
								<Flex align="center" mb={2}>
									<Icon as={FaPaintBrush} color="blue.500" mr={2} />
									<Heading as="h3" size="md">
										Comic Preferences
									</Heading>
								</Flex>

								<Field.Root id="genre" required>
									<Field.Label>Favorite Comic Genre</Field.Label>
									<NativeSelect.Root><NativeSelect.Field
										name="genre"
										value={formData.genre}
										onChange={handleChange}
										placeholder="Select a genre"
									>
										{comicGenres.map((genre) => (
											<option key={genre} value={genre}>
												{genre}
											</option>
										))}
									</NativeSelect.Field></NativeSelect.Root>
								</Field.Root>

								<Field.Root id="style" required>
									<Field.Label>Preferred Style</Field.Label>
									<NativeSelect.Root><NativeSelect.Field
										name="style"
										value={formData.style}
										onChange={handleChange}
										placeholder="Select a style"
									>
										{comicStyles.map((style) => (
											<option key={style} value={style}>
												{style}
											</option>
										))}
									</NativeSelect.Field></NativeSelect.Root>
								</Field.Root>

								<Field.Root id="purpose">
									<Field.Label>Purpose</Field.Label>
									<NativeSelect.Root><NativeSelect.Field
										name="purpose"
										value={formData.purpose}
										onChange={handleChange}
										placeholder="Why are you looking for comics?"
									>
										{purposes.map((purpose) => (
											<option key={purpose} value={purpose}>
												{purpose}
											</option>
										))}
									</NativeSelect.Field></NativeSelect.Root>
								</Field.Root>
							</VStack>
						</SimpleGrid>

						<Button type="submit" colorPalette="blue" width="full" mt={8} size="lg" fontWeight="bold">
							Get Personalized Comic Suggestion
						</Button>
					</form>
				</Card.Body>
			</Card.Root>
		</Container>
	);
}
