"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/utils/supabaseClient";
import {Field, 
  Box,
  Button,
  Container,
  Heading,
  VStack, Flex,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { useUser } from "@/contexts/UserContext";
import ImageUpload from "@/components/ImageUpload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Dynamically import RichTextEditor to disable SSR (so it only runs on the client)
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

// Define Zod schema for form validation
const postSchema = z.object({
  content: z.string().min(6, "Content is required"),
  imageUrl: z.string().optional(),
});

type PostFormData = z.infer<typeof postSchema>;

const CreatePostPage = (props: { params: Promise<{ id: string; topicId: string }> }) => {
  const params = use(props.params);
  const { id, topicId } = params;
  const { user } = useUser();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors }, watch } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
  });

  const onSubmit = async (data: PostFormData) => {
    if (!user) {
      toaster.create({
        title: "Error",
        description: "You need to be signed in to create a post.",
        type: "error",
        duration: 5000,
      });
      return;
    }

    const { data: postData, error } = await supabase
      .from("posts")
      .insert([{ topic_id: topicId, content: data.content, image_url: imageUrl, created_by: user.id }]);

    if (error) {
      console.error(error);
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
      router.push(`/forums/${id}/topics/${topicId}`);
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <Flex justifyContent="space-between" mb={4}>
        <Button
          colorPalette="teal"
          onClick={() => router.push(`/forums/${id}/topics/${topicId}`)}
        >
          Back to Posts
        </Button>
      </Flex>
      <Heading mb={4}>Create Post</Heading>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack gap={4} align="stretch">
          <Field.Root invalid={!!errors.content}>
            <Field.Label>Content</Field.Label>
            <RichTextEditor
              value={watch("content")}
              onChange={(value) => setValue("content", value)}
              style={{ height: "400px" }}
            />
            <Field.ErrorText>
              {errors.content && errors.content.message}
            </Field.ErrorText>
          </Field.Root>
          <ImageUpload
            onUpload={(url) => {
              setImageUrl(url);
              setValue("imageUrl", url);
            }}
          />
          <Button colorPalette="teal" type="submit">
            Create Post
          </Button>
        </VStack>
      </form>
    </Container>
  );
};

export default CreatePostPage;
