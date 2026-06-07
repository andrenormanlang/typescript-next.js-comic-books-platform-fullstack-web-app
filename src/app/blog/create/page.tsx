'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import { FormProvider, useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/utils/supabase/client";
import { Button, Center, Container, Field, Input, VStack, Box } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import ImageUpload from "@/components/ImageUpload";
import { useUser } from "@/contexts/UserContext";
import ComicSpinner from "@/helpers/ComicSpinner";
import { redirectToLogin } from '@/utils/authRedirect';

// Dynamically import RichTextEditor to disable SSR (so it only runs on the client)
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

// Define the Zod schema for the blog post
const postSchema = z.object({
	title: z.string().min(10, "Title is required"),
	content: z.string().min(100, "Content is required"),
	imageUrl: z.string().optional(),
});

type PostFormData = z.infer<typeof postSchema>;

const CreateBlogPostPage = () => {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const { user } = useUser();
	const router = useRouter();
	const supabase = createClient();

	// Set up react-hook-form with validation
	const methods = useForm<PostFormData>({
		resolver: zodResolver(postSchema),
	});

	const { register, handleSubmit, setValue, formState: { errors }, watch } = methods;

	useEffect(() => {
		// Redirect to login if there is no user
		if (!user) {
			redirectToLogin(router, '/blog/create');
		}
	}, [user, router]);

	const onSubmit: SubmitHandler<PostFormData> = async (data) => {
		if (!user) {
			toaster.create({
				title: "Error",
				description: "You must be signed in to create a post.",
				type: "error",
				duration: 5000,
			});
			return;
		}

		const authorName = user.username || user.email || "Anonymous";

		setLoading(true);
		const { error } = await supabase.from("blog_posts").insert([
			{
				...data,
				imageUrl,
				author_name: authorName,
				author_id: user.id,
			},
		]);

		setLoading(false);

		if (error) {
			toaster.create({
				title: "Error",
				description: error.message,
				type: "error",
				duration: 5000,
			});
		} else {
			toaster.create({
				title: "Success",
				description: "Post created successfully.",
				type: "success",
				duration: 5000,
			});
			router.push("/blog");
		}
	};

	if (loading) {
		return (
			<Center h="100vh">
				<ComicSpinner />
			</Center>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<Container maxW="container.md" py={8}>
			<Button mt={4} mb={4} onClick={() => router.back()}>
				Back
			</Button>

			<FormProvider {...methods}>
				<form onSubmit={handleSubmit(onSubmit)}>
					<VStack gap={4} align="stretch">
						<Field.Root invalid={!!errors.title}>
							<Field.Label>Title</Field.Label>
							<Input {...register("title")} />
							{errors.title && <p style={{ color: "red" }}>{errors.title.message}</p>}
						</Field.Root>

						<ImageUpload
							onUpload={(url) => {
								setImageUrl(url);
								setValue("imageUrl", url);
							}}
						/>

						<Field.Root invalid={!!errors.content}>
							<Field.Label>Content</Field.Label>
							<Box maxH="500px" overflowY="auto" border="1px solid #ccc" borderRadius="6px">
								<RichTextEditor
									value={watch("content")}
									onChange={(value) => setValue("content", value)}
									style={{ height: "400px" }}
								/>
							</Box>
							{errors.content && <p style={{ color: "red" }}>{errors.content.message}</p>}
						</Field.Root>

						<Button colorPalette="teal" type="submit">
							Create Post
						</Button>
					</VStack>
				</form>
			</FormProvider>
		</Container>
	);
};

export default CreateBlogPostPage;
