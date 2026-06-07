"use client";

// components/comics/ComicFormClient.tsx
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/utils/supabase/client";
import {NativeSelect, 
	Box,
	Button,
	Field,
	Input,
	VStack,
	Heading,
	Spinner,
	Alert,
	Center,
	Text } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";

import { v4 as uuidv4 } from "uuid";
import { useUser } from "@/contexts/UserContext";
import ImageUpload from "./image-upload";
import { useRouter } from "next/navigation";
import { redirectToLogin } from "@/utils/authRedirect";

// Dynamically import RichTextEditor so it only runs on the client
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
	ssr: false,
});

// 1. Define Zod schema
const validationSchema = z.object({
	image: z.string().optional(),
	title: z.string().min(3, { message: "Title is required" }),
	publisher: z.string().min(2, { message: "Publisher is required" }),
	release_date: z.string().min(1, { message: "Release date is required" }),
	price: z.preprocess((val) => parseFloat(val as string), z.number().positive({ message: "Price must be positive" })),
	stock: z.preprocess((val) => parseFloat(val as string), z.number().positive({ message: "Stock must be positive" })),
	pages: z.preprocess((val) => parseInt(val as string), z.number().positive({ message: "Pages must be positive" })),
	main_artist: z.string().min(1, { message: "Main artist is required" }),
	main_writer: z.string().min(1, { message: "Main writer is required" }),
	description: z.string().min(20, {
		message: "Description must be at least 20 characters",
	}),
	currency: z.string().min(1, { message: "Currency is required" }),
	genre: z.string().min(1, { message: "Genre is required" }),
});

type FormData = z.infer<typeof validationSchema>;

export default function ComicFormClient() {
	const supabase = createClient();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [imageURL, setImageURL] = useState<string | null>(null);

	const { user, isLoading } = useUser();
	const router = useRouter();

	// 3. Setup react-hook-form
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		setValue,
		watch,
	} = useForm<FormData>({
		resolver: zodResolver(validationSchema),
		defaultValues: {
			title: "",
			main_artist: "",
			publisher: "",
			release_date: "",
			description: "",
			price: 0,
			stock: 0,
			image: "",
			main_writer: "",
			pages: 0,
			currency: "",
			genre: "",
		},
	});

	// Add simple redirect effect
	useEffect(() => {
		if (!isLoading && !user) {
			redirectToLogin(router, "/comics-store/sell");
		}
	}, [user, isLoading, router]);

	// If loading or no user, return null (redirect will happen in effect)
	if (isLoading || !user) {
		return null;
	}

	// 4. Submit handler
	const onSubmit: SubmitHandler<FormData> = async (data) => {
		try {
			setLoading(true);

			// Check if user is admin
			const { data: profile, error: profileError } = await supabase
				.from("profiles")
				.select("is_admin")
				.eq("id", user.id)
				.single();

			if (profileError) throw profileError;
			const approvedStatus = profile.is_admin;

			// Insert new record
			const comicId = uuidv4();
			const { error: insertError } = await supabase.from("comics-sell").insert([
				{
					id: comicId,
					...data,
					image: imageURL,
					user_id: user.id,
					is_approved: approvedStatus,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			]);

			if (insertError) throw insertError;

			toaster.create({
				title: approvedStatus ? "Comic book posted!" : "Comic book submitted for review!",
				description: approvedStatus
					? "Your comic book is now live."
					: "Your comic book is pending admin approval.",
				type: "success",
				duration: 5000,
			});

			// Reset form
			reset();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
			setError("Error submitting comic book: " + errorMessage);
		} finally {
			setLoading(false);
		}
	};

	// Lists for dropdowns
	const publishers = [
		"Marvel Comics",
		"Editora Abril",
		"DC Comics",
		"Vertigo",
		"Image Comics",
		"Dark Horse Comics",
		"IDW Publishing",
		"Valiant Comics",
		"Dynamite Entertainment",
		"Boom! Studios",
	];

	const currencies = [
		{ value: "BRL", label: "Brazilian Real (BRL)" },
		{ value: "DKK", label: "Danish Krone (DKK)" },
		{ value: "SEK", label: "Swedish Krona (SEK)" },
		{ value: "USD", label: "US Dollar (USD)" },
		{ value: "EUR", label: "Euro (EUR)" },
	];

	const genres = [
		"Superhero",
		"Science Fiction",
		"Fantasy",
		"Horror",
		"Mystery/Crime",
		"Romance",
		"Comedy/Humor",
		"Drama",
		"Historical",
		"Slice of Life",
		"Adventure",
		"Thriller/Suspense",
		"Western",
		"War/Military",
		"Biographical/Autobiographical",
		"Educational/Non-Fiction",
		"Anthology",
	];

	return (
		<Center>
			<Box p={8} maxWidth={{ base: "90%", md: "600px" }} width="full" boxShadow="md" borderRadius="md">
				<Heading as="h1" size="lg" mb={6} textAlign="center">
					Sell Comic Book
				</Heading>

				{error && (
					<Alert.Root status="error" mb={4}>
						<Alert.Indicator />
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				)}

				{loading ? (
					<Center height="100%">
						<Spinner />
					</Center>
				) : (
					<VStack gap={4} as="form" onSubmit={handleSubmit(onSubmit)}>
						<Field.Root id="image" invalid={!!errors.image}>
							<Field.Label>Image</Field.Label>
							<ImageUpload onUpload={(url) => setImageURL(url)} />
							{errors.image && <Text color="red.500">{errors.image.message}</Text>}
						</Field.Root>

						<Field.Root id="title" invalid={!!errors.title}>
							<Field.Label>Title</Field.Label>
							<Input type="text" {...register("title")} />
							{errors.title && <Text color="red.500">{errors.title.message}</Text>}
						</Field.Root>

						<Field.Root id="publisher" invalid={!!errors.publisher}>
							<Field.Label>Publisher</Field.Label>
							<NativeSelect.Root><NativeSelect.Field placeholder="Select publisher" {...register("publisher")}>
								{publishers.map((publisher) => (
									<option key={publisher} value={publisher}>
										{publisher}
									</option>
								))}
							</NativeSelect.Field></NativeSelect.Root>
							{errors.publisher && <Text color="red.500">{errors.publisher.message}</Text>}
						</Field.Root>

						<Field.Root id="genre" invalid={!!errors.genre}>
							<Field.Label>Genre</Field.Label>
							<NativeSelect.Root><NativeSelect.Field placeholder="Select genre" {...register("genre")}>
								{genres.map((genre) => (
									<option key={genre} value={genre}>
										{genre}
									</option>
								))}
							</NativeSelect.Field></NativeSelect.Root>
							{errors.genre && <Text color="red.500">{errors.genre.message}</Text>}
						</Field.Root>

						<Field.Root id="release_date" invalid={!!errors.release_date}>
							<Field.Label>Release Date</Field.Label>
							<Input type="date" {...register("release_date")} />
							{errors.release_date && <Text color="red.500">{errors.release_date.message}</Text>}
						</Field.Root>

						<Field.Root id="currency" invalid={!!errors.currency}>
							<Field.Label>Currency</Field.Label>
							<NativeSelect.Root><NativeSelect.Field placeholder="Select currency" {...register("currency")}>
								{currencies.map((currency) => (
									<option key={currency.value} value={currency.value}>
										{currency.label}
									</option>
								))}
							</NativeSelect.Field></NativeSelect.Root>
							{errors.currency && <Text color="red.500">{errors.currency.message}</Text>}
						</Field.Root>

						<Field.Root id="price" invalid={!!errors.price}>
							<Field.Label>Price</Field.Label>
							<Input type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
							{errors.price && <Text color="red.500">{errors.price.message}</Text>}
						</Field.Root>

						<Field.Root id="stock" invalid={!!errors.stock}>
							<Field.Label>Quantity to Sell</Field.Label>
							<Input type="number" {...register("stock", { valueAsNumber: true })} />
							{errors.stock && <Text color="red.500">{errors.stock.message}</Text>}
						</Field.Root>

						<Field.Root id="pages" invalid={!!errors.pages}>
							<Field.Label>Number of Pages</Field.Label>
							<Input type="number" {...register("pages", { valueAsNumber: true })} />
							{errors.pages && <Text color="red.500">{errors.pages.message}</Text>}
						</Field.Root>

						<Field.Root id="main_artist" invalid={!!errors.main_artist}>
							<Field.Label>Main Artist</Field.Label>
							<Input type="text" {...register("main_artist")} />
							{errors.main_artist && <Text color="red.500">{errors.main_artist.message}</Text>}
						</Field.Root>

						<Field.Root id="main_writer" invalid={!!errors.main_writer}>
							<Field.Label>Main Writer</Field.Label>
							<Input type="text" {...register("main_writer")} />
							{errors.main_writer && <Text color="red.500">{errors.main_writer.message}</Text>}
						</Field.Root>

						<Field.Root invalid={!!errors.description}>
							<Field.Label>Description</Field.Label>
							<Box
								css={{
									".tox-tinymce": {
										resize: "vertical",
										minHeight: "300px",
										maxHeight: "800px",
										overflow: "auto",
									},
								}}
							>
								<RichTextEditor
									value={watch("description")}
									onChange={(value) => setValue("description", value)}
									placeholder="Enter description..."
								/>
							</Box>
							{errors.description && <Text color="red.500">{errors.description.message}</Text>}
						</Field.Root>

						<Button colorPalette="teal" width="300px" type="submit" disabled={loading}>
							{loading ? "Loading ..." : "Post Comic"}
						</Button>
					</VStack>
				)}
			</Box>
		</Center>
	);
}
