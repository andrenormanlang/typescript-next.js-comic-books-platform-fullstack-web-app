"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
	Box,
	Button,
	Input,
	FormControl,
	FormLabel,
	Heading,
	VStack,
	Select,
	Text,
	Container,
	SimpleGrid,
	Flex,
	Icon,
	Card,
	CardBody,
	Divider,
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
			<Card boxShadow="lg" borderRadius="lg" overflow="hidden">
				<CardBody>
					<Text mb={6} textAlign="center">
						Fill out this form to receive AI-powered comic recommendations tailored to your preferences.
					</Text>
					<Divider mb={6} />

					<form onSubmit={handleSubmit}>
						<SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
							<VStack spacing={4} align="stretch">
								<Flex align="center" mb={2}>
									<Icon as={FaBook} color="blue.500" mr={2} />
									<Heading as="h3" size="md">
										Personal Info
									</Heading>
								</Flex>

								<FormControl id="age" isRequired>
									<FormLabel>Age</FormLabel>
									<Input type="number" name="age" value={formData.age} onChange={handleChange} />
								</FormControl>

								<FormControl id="experience">
									<FormLabel>Your Comic Experience</FormLabel>
									<Select
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
									</Select>
								</FormControl>
							</VStack>

							<VStack spacing={4} align="stretch">
								<Flex align="center" mb={2}>
									<Icon as={FaPaintBrush} color="blue.500" mr={2} />
									<Heading as="h3" size="md">
										Comic Preferences
									</Heading>
								</Flex>

								<FormControl id="genre" isRequired>
									<FormLabel>Favorite Comic Genre</FormLabel>
									<Select
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
									</Select>
								</FormControl>

								<FormControl id="style" isRequired>
									<FormLabel>Preferred Style</FormLabel>
									<Select
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
									</Select>
								</FormControl>

								<FormControl id="purpose">
									<FormLabel>Purpose</FormLabel>
									<Select
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
									</Select>
								</FormControl>
							</VStack>
						</SimpleGrid>

						<Button type="submit" colorScheme="blue" width="full" mt={8} size="lg" fontWeight="bold">
							Get Personalized Comic Suggestion
						</Button>
					</form>
				</CardBody>
			</Card>
		</Container>
	);
}
