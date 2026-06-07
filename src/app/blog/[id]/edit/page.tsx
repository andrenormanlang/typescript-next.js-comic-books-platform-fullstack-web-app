"use client";

// import { createClient } from "@/utils/supabase/server";
// import { notFound } from "next/navigation";
// import EditBlogPost from "./_components/EditBlogPost";

// export default async function BlogEditPage({ params: { id } }: { params: { id: string } }) {
// 	const supabase = createClient();

// 	// Server-side data fetching
// 	const { data: blog, error } = await supabase.from("blog_posts").select("*").eq("id", id).single();

// 	if (error || !blog) {
// 		notFound();
// 	}

// 	// Server-side admin check
// 	const {
// 		data: { user },
// 	} = await supabase.auth.getUser();
// 	const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user?.id).single();

// 	if (!profile?.is_admin) {
// 		notFound();
// 	}

// 	return <EditBlogPost initialBlog={blog} />;
// }

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { FormProvider, useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/utils/supabase/client";
import {
	Box,
	Button,
	Container,
	Field,
	Input,
	VStack,
	Center,
	Spinner,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import ImageUpload from "@/components/ImageUpload";

// Dynamically import RichTextEditor to disable SSR (so it only runs on the client)
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

// Define Zod schema for form validation
const postSchema = z.object({
	title: z.string().min(10, "Title is required"),
	content: z.string().min(100, "Content is required"),
	imageUrl: z.string().optional(),
});
type PostFormData = z.infer<typeof postSchema>;

const EditBlogPost = () => {
	const params = useParams();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;
	const supabase = createClient();
	const router = useRouter();

	// Create the form methods object.
	const methods = useForm<PostFormData>({
		resolver: zodResolver(postSchema),
	});
	// Destructure needed methods.
	const {
		register,
		setValue,
		formState: { errors },
		watch,
	} = methods;

	const [isAdmin, setIsAdmin] = useState(false);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!id) return;

		const fetchPostData = async () => {
			const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).single();

			if (data) {
				setValue("title", data.title);
				setValue("content", data.content);
				setValue("imageUrl", data.imageUrl);
				setImageUrl(data.imageUrl);
			} else {
				toaster.create({
					title: "Error",
					description: error?.message,
					type: "error",
					duration: 5000,
				});
			}
			setLoading(false);
		};

		const checkAdmin = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				toaster.create({
					title: "Error",
					description: "User not authenticated.",
					type: "error",
					duration: 5000,
				});
				return;
			}

			const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();

			if (error) {
				toaster.create({
					title: "Error",
					description: "Error fetching profile data.",
					type: "error",
					duration: 5000,
				});
				return;
			}

			if (data?.is_admin) {
				setIsAdmin(true);
			} else {
				toaster.create({
					title: "Error",
					description: "Only admin users can edit blog posts.",
					type: "error",
					duration: 5000,
				});
				router.push(`/blog/${id}`);
			}
		};

		fetchPostData();
		checkAdmin();
	}, [id]); // eslint-disable-line react-hooks/exhaustive-deps

	const onSubmit: SubmitHandler<PostFormData> = async (data) => {
		if (!isAdmin) {
			toaster.create({
				title: "Error",
				description: "Only admin users can edit blog posts.",
				type: "error",
				duration: 5000,
			});
			return;
		}

		const postData = {
			...data,
			updated_at: new Date().toISOString(),
		};

		const { error } = await supabase.from("blog_posts").update(postData).eq("id", id);

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
				description:
					"Blog post updated successfully.",
				type: "success",
				duration: 5000,
			});
			// Removed automatic redirect to avoid unexpected navigation.
			// If you still want to navigate automatically, uncomment the next line.
			// router.push(`/blog`);
		}
	};

	if (loading) {
		return (
			<Center h="100vh">
				<Spinner size="xl" color="red.500" />
			</Center>
		);
	}

	console.log(methods);

	return (
		<Container maxW="container.md" py={8}>
			{/* <style jsx global>{`
        .ql-toolbar.ql-snow {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #fff;
        }
      `}</style> */}

			<Box mb={4}>
				<Button onClick={() => router.back()}>Back to Blog</Button>
			</Box>
			<FormProvider {...methods}>
				<form onSubmit={methods.handleSubmit(onSubmit)}>
					<VStack gap={4} align="stretch">
						<Field.Root invalid={!!errors.title}>
							<Field.Label>Title</Field.Label>
							<Input {...register("title")} />
							{errors.title && <p style={{ color: "red" }}>{errors.title.message}</p>}
						</Field.Root>

						<ImageUpload
							onUpload={(url) => {
								setValue("imageUrl", url);
								setImageUrl(url);
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

						<Button type="submit">Save</Button>
					</VStack>
				</form>
			</FormProvider>
		</Container>
	);
};

export default EditBlogPost;
