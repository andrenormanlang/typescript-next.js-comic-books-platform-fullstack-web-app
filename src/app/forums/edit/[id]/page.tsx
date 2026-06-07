'use client';

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/utils/supabaseClient";
import {Field, 
  Box,
  Button,
  Input,
  Spinner,
  Center,
  Text,
  VStack, Textarea,
  Container,
  Flex,
  Heading,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { ArrowLeft } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";


const validationSchema = z.object({
  title: z.string().min(6, { message: "Title is required" }),
  description: z.string().min(6, { message: "Description is required" }),
  image: z.string().url({ message: "Image URL must be valid" }).optional(),
});

type FormData = z.infer<typeof validationSchema>;

const EditForum = () => {
  const pathname = usePathname();
  const router = useRouter();
  const pathParts = pathname.split("/");
  const id = pathParts.pop();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forum, setForum] = useState<any | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      title: "",
      description: "",
      image: "",
    },
  });

  const fetchForum = useCallback(async () => {
    if (id) {
      try {
        const { data, error } = await supabase.from("forums").select("*").eq("id", id).single();
        if (error) throw error;
        setForum(data);
        reset(data);
      } catch (error: any) {
        setError("Error loading forum data!");
      } finally {
        setLoading(false);
      }
    }
  }, [id, reset]);

  useEffect(() => {
    fetchForum();
  }, [fetchForum]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      setLoading(true);
      const { error } = await supabase.from("forums").update(data).eq("id", id);
      if (error) throw error;
      toaster.create({
        title: "Forum updated.",
        description: "The forum has been successfully updated.",
        type: "success",
        duration: 5000,
      });
      router.push("/forums");
    } catch (error: any) {
      setError("Error updating the forum!");
      toaster.create({
        title: "Error updating forum.",
        description: error.message,
        type: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (url: string) => {
    setValue("image", url);
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
        <Button  colorPalette="teal" variant="outline" onClick={() => router.push("/forums")}>
          Back to Forums
        </Button>
      </Box>
      <Flex
        direction="column"
        bg="gray.800"
        p={6}
        borderRadius="md"
        borderWidth="1px"
        borderColor="gray.700"
      >
        <VStack as="form" onSubmit={handleSubmit(onSubmit)} align="start" gap={4} p={4}>
          <Heading>Edit Forum</Heading>
          <Field.Root invalid={!!errors.title}>
            <Field.Label>Title</Field.Label>
            <Input type="text" {...register("title")} />
            {errors.title && <Text color="red.500">{errors.title.message}</Text>}
          </Field.Root>
          <Field.Root invalid={!!errors.description}>
            <Field.Label>Description</Field.Label>
            <Textarea {...register("description")} />
            {errors.description && <Text color="red.500">{errors.description.message}</Text>}
          </Field.Root>
          <Field.Root invalid={!!errors.image}>
            <Field.Label>Image URL</Field.Label>
            <ImageUpload onUpload={handleImageUpload} />
            {errors.image && <Text color="red.500">{errors.image.message}</Text>}
          </Field.Root>
          <Button colorPalette="teal" width="300px" type="submit" disabled={loading}>
            {loading ? "Loading ..." : "Update Forum"}
          </Button>
        </VStack>
      </Flex>
    </Container>
  );
};

export default EditForum;

