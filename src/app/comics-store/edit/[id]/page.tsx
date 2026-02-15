"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/utils/supabase/client";
import {
	Box,
	Button,
	Input,
	Spinner,
	Center,
	Text,
	VStack,
	FormControl,
	FormLabel,
	Select,
	useToast,
	Container,
	Flex,
	Heading,
	Image,
	useColorMode,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ImageUpload from "./image-upload";
import { Comic } from "@/types/comics-store/comic-detail.type";
import { useUpdateComics } from "@/hooks/comic-table/useUpdateComics";

// Dynamically import RichTextEditor to disable SSR (so it only runs on the client)
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

// Validation schema
const validationSchema = z.object({
	image: z.string().optional(),
	title: z.string().min(1, { message: "Title is required" }),
	publisher: z.string().min(1, { message: "Publisher is required" }),
	release_date: z.string().min(1, { message: "Release date is required" }),
	price: z.preprocess((val) => parseFloat(val as string), z.number().positive({ message: "Price must be positive" })),
	pages: z.preprocess((val) => parseInt(val as string), z.number().positive({ message: "Pages must be positive" })),
	main_artist: z.string().min(1, { message: "Main artist is required" }),
	main_writer: z.string().min(1, { message: "Main writer is required" }),
	description: z.string().min(1, { message: "Description is required" }),
	currency: z.string().min(1, { message: "Currency is required" }),
	genre: z.string().min(1, { message: "Genre is required" }),
	stock: z.preprocess(
		(val) => parseInt(val as string),
		z.number().nonnegative({ message: "Stock must be 0 or greater" }),
	),
});

type FormData = z.infer<typeof validationSchema>;

const EditComic = () => {
	const { colorMode } = useColorMode();
	const pathname = usePathname();
	const router = useRouter();
	const pathParts = pathname.split("/");
	const id = pathParts.pop();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const toast = useToast();
	const [comic, setComic] = useState<Comic | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		reset,
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
			image: "",
			main_writer: "",
			pages: 0,
			currency: "",
			genre: "",
			stock: 0,
		},
	});

	const updateStockAndPriceMutation = useUpdateComics();

	const publishers = [
		"Marvel Comics",
		"Editorial Abril",
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

	const fetchComic = useCallback(async () => {
		if (id) {
			try {
				const { data, error } = await supabase.from("comics-sell").select("*").eq("id", id).single();

				if (error) throw error;

				setComic(data);
				reset(data);
				// Explicitly set the description value
				setValue("description", data.description);
			} catch (error: any) {
				setError("Error loading comic data!");
			} finally {
				setLoading(false);
			}
		}
	}, [id, reset, setValue]);

	useEffect(() => {
		fetchComic();
	}, [fetchComic]);

	const onSubmit: SubmitHandler<FormData> = async (data) => {
		try {
			setLoading(true);
			const { error } = await supabase.from("comics-sell").update(data).eq("id", id);

			if (error) throw error;

			updateStockAndPriceMutation.mutate({
				comicId: id!,
				newStock: data.stock,
				newPrice: data.price,
			});

			toast({
				title: "Comic updated.",
				description: "The comic has been successfully updated.",
				status: "success",
				duration: 5000,
				isClosable: true,
			});

			// Removed automatic redirect to home to prevent unexpected navigation.
			// If desired, re-enable by uncommenting:
			// router.push("/");
		} catch (error: any) {
			setError("Error updating the comic!");
			toast({
				title: "Error updating comic.",
				description: error.message,
				status: "error",
				duration: 5000,
				isClosable: true,
			});
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<Center h="100vh">
				<Spinner size="xl" />
			</Center>
		);
	}

	if (error) {
		return (
			<Center h="100vh">
				<Text>Error: {error}</Text>
			</Center>
		);
	}

	return (
		<Container maxW="container.xl" p={4}>
			<Box mb={4}>
				<Button leftIcon={<ArrowBackIcon />} colorScheme="teal" variant="outline" onClick={() => router.back()}>
					Back to Grid
				</Button>
			</Box>
			<Flex
				direction={{ base: "column", md: "row" }}
				bg={colorMode === "dark" ? "gray.700" : "gray.100"}
				p={6}
				borderRadius="md"
				borderWidth="1px"
				borderColor={colorMode === "dark" ? "gray.600" : "gray.300"}
			>
				<VStack
					as="form"
					onSubmit={handleSubmit(onSubmit)}
					flex="2"
					align="start"
					spacing={4}
					p={4}
					position="relative"
					height="100%"
				>
					<Box flex="1" mb={{ base: 4, md: 0 }}>
						<Heading as="h3" size="sm" mb={4}>
							Current Cover Image
						</Heading>
						<Image
							borderRadius="md"
							objectFit="contain"
							src={comic?.image || "../../public/default-image.jpg"}
							alt={`Cover of ${comic?.title}`}
							width="70%"
						/>
					</Box>
					<FormControl isInvalid={!!errors.title}>
						<FormLabel>Title</FormLabel>
						<Input type="text" {...register("title")} maxWidth={"500px"} />
						{errors.title && <Text color="red.500">{errors.title.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.image}>
						<FormLabel>New Cover Image</FormLabel>
						<ImageUpload onUpload={(url) => setValue("image", url)} />
						{errors.image && <Text color="red.500">{errors.image.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.genre}>
						<FormLabel>Genre</FormLabel>
						<Select placeholder="Select genre" {...register("genre")} maxWidth={"250px"}>
							{genres.map((genre) => (
								<option key={genre} value={genre}>
									{genre}
								</option>
							))}
						</Select>
						{errors.genre && <Text color="red.500">{errors.genre.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.release_date} maxWidth={"180px"}>
						<FormLabel>Release Date</FormLabel>
						<Input type="date" {...register("release_date")} />
						{errors.release_date && <Text color="red.500">{errors.release_date.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.stock}>
						<FormLabel>Stock</FormLabel>
						<Input type="number" {...register("stock", { valueAsNumber: true })} maxWidth={"50px"} />
						{errors.stock && <Text color="red.500">{errors.stock.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.currency}>
						<FormLabel>Currency</FormLabel>
						<Select placeholder="Select currency" {...register("currency")} maxWidth={"180px"}>
							{currencies.map((currency) => (
								<option key={currency.value} value={currency.value}>
									{currency.label}
								</option>
							))}
						</Select>
						{errors.currency && <Text color="red.500">{errors.currency.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.price}>
						<FormLabel>Price</FormLabel>
						<Input
							type="number"
							step="0.01"
							{...register("price", { valueAsNumber: true })}
							maxWidth={"80px"}
						/>
						{errors.price && <Text color="red.500">{errors.price.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.pages}>
						<FormLabel>Number of Pages</FormLabel>
						<Input type="number" {...register("pages", { valueAsNumber: true })} maxWidth={"80px"} />
						{errors.pages && <Text color="red.500">{errors.pages.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.publisher}>
						<FormLabel>Publisher</FormLabel>
						<Select placeholder="Select publisher" {...register("publisher")} maxWidth={"200px"}>
							{publishers.map((publisher) => (
								<option key={publisher} value={publisher}>
									{publisher}
								</option>
							))}
						</Select>
						{errors.publisher && <Text color="red.500">{errors.publisher.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.main_artist}>
						<FormLabel>Main Artist</FormLabel>
						<Input type="text" {...register("main_artist")} maxWidth={"250px"} />
						{errors.main_artist && <Text color="red.500">{errors.main_artist.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.main_writer}>
						<FormLabel>Main Writer</FormLabel>
						<Input type="text" {...register("main_writer")} maxWidth={"250px"} />
						{errors.main_writer && <Text color="red.500">{errors.main_writer.message}</Text>}
					</FormControl>
					<FormControl isInvalid={!!errors.description}>
						<FormLabel>Description</FormLabel>
						{/* Hidden input for react-hook-form registration */}
						<Input type="text" {...register("description")} style={{ display: "none" }} />
						<Box
							sx={{
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
							/>
						</Box>
						{errors.description && <Text color="red.500">{errors.description.message}</Text>}
					</FormControl>
					<Box bottom={4} width="100%" textAlign="center" mt={8} pb={4}>
						<Button colorScheme="teal" width="300px" type="submit" isDisabled={loading} size="lg">
							{loading ? "Loading ..." : "Update Comic"}
						</Button>
					</Box>
				</VStack>
			</Flex>
		</Container>
	);
};

export default EditComic;
