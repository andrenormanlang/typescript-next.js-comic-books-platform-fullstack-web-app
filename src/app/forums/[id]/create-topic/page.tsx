'use client';

import { useColorModeValue } from "@/components/ui/color-mode";
import { useRouter, useParams } from "next/navigation"; // Import useParams
import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import {Field, 
  Box,
  Button,
  Input,
  Spinner,
  Center, Textarea,
  VStack,
  Container,
  Heading, Flex,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { useUser } from "@/contexts/UserContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Define Zod schema
const topicSchema = z.object({
  title: z.string().min(6, "Title is required"),
  description: z.string().min(6, "Description is required"),
});

type TopicFormData = z.infer<typeof topicSchema>;

const CreateTopic: React.FC = () => { // No props
  const params = useParams(); // Correct usage of useParams
  const { id } = params; // Destructure 'id' from params
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TopicFormData>({
    resolver: zodResolver(topicSchema),
  });

  const cardBg = useColorModeValue('white', 'gray.700');
  const cardText = useColorModeValue('gray.800', 'white');
  const cardHover = useColorModeValue('gray.100', 'gray.600');

  const onSubmit = async (data: TopicFormData) => {
    if (!user) {
      toaster.create({
        title: "Error",
        description: "You need to be signed in to create a topic.",
        type: "error",
        duration: 5000,
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("topics").insert([{ forum_id: id, ...data, created_by: user.id }]);
      if (error) throw error;

      toaster.create({
        title: "Topic created.",
        description: "Your topic has been created successfully.",
        type: "success",
        duration: 5000,
      });

      router.push(`/forums/${id}`);
    } catch (error) {
      console.error("Error creating topic:", error);
      toaster.create({
        title: "Error",
        description: "There was an error creating the topic.",
        type: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <Flex justifyContent="space-between" mb={4}>
        <Button colorPalette="teal" onClick={() => router.push(`/forums/${id}`)}>
          Back to Topics
        </Button>
      </Flex>
      <Box
        bg={cardBg}
        p={8}
        borderRadius="md"
        boxShadow="md"
        color={cardText}
      >
        <Heading as="h1" size="lg" textAlign="center" mb={6}>
          Create a New Topic
        </Heading>
        {loading ? (
          <Center height="50vh">
            <Spinner size="xl" />
          </Center>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <VStack gap={4}>
              <Field.Root id="title" invalid={!!errors.title}>
                <Field.Label>Title</Field.Label>
                <Input
                  {...register("title")}
                  placeholder="Enter topic title"
                />
                <Field.ErrorText>{errors.title && errors.title.message}</Field.ErrorText>
              </Field.Root>
              <Field.Root id="description" invalid={!!errors.description}>
                <Field.Label>Description</Field.Label>
                <Textarea
                  {...register("description")}
                  placeholder="Enter topic description"
                />
                <Field.ErrorText>{errors.description && errors.description.message}</Field.ErrorText>
              </Field.Root>
              <Button
                colorPalette="teal"
                width="full"
                type="submit"
                _hover={{ bg: cardHover }}
              >
                Create Topic
              </Button>
            </VStack>
          </form>
        )}
      </Box>
    </Container>
  );
};

export default CreateTopic;

