"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { postSchema, type PostFormData } from "@/lib/validations/blog";
import { createClient } from "@/utils/supabase/client";
import { Box, Button, Container, Field, Input, VStack, Text } from "@chakra-ui/react";
import ImageUpload from "@/components/ImageUpload";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

interface EditBlogPostProps {
	initialBlog: PostFormData;
}

export default function EditBlogPost({ initialBlog }: EditBlogPostProps) {
	const router = useRouter();
	const supabase = createClient();

	const methods = useForm<PostFormData>({
		resolver: zodResolver(postSchema),
		defaultValues: initialBlog,
	});

	const {
		watch,
		setValue,
		formState: { errors },
	} = methods;

	return (
		<Container maxW="container.md" py={8}>
			<FormProvider {...methods}>
				<form>
					<Field.Root required>
						<Field.Label>Content</Field.Label>
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
								value={watch("content")}
								onChange={(value) => setValue("content", value)}
								placeholder="Write your blog post content here..."
							/>
						</Box>
						{errors.content && <Text color="red.500">{errors.content.message}</Text>}
					</Field.Root>
				</form>
			</FormProvider>
		</Container>
	);
}
