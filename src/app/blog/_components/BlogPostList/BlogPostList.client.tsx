"use client";

// components/blog/BlogPostListClient.tsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  Text,
  Flex,
  Image,
  Center,
  IconButton,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { Pencil, Trash2 } from "lucide-react";
import { BlogPost } from "@/types/blog/blog.type";
import ComicSpinner from "@/helpers/ComicSpinner";
import { useUser } from "@/contexts/UserContext";

interface BlogPostListClientProps {
  initialPosts: BlogPost[]; // The posts fetched from the server
}

export default function BlogPostListClient({ initialPosts }: BlogPostListClientProps) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    // Check if user is admin
    if (user) {
      checkAdminStatus(user.id);
    }

    // Set up real-time subscription for blog_posts
    const subscription = supabase
      .channel("public:blog_posts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_posts" },
        handleRealTimeUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Real-time event handler
  const handleRealTimeUpdate = (payload: any) => {
    const newPost: BlogPost = payload.new;
    const oldPost: BlogPost = payload.old;

    switch (payload.eventType) {
      case "INSERT":
        setPosts((prev) => [newPost, ...prev]);
        break;
      case "UPDATE":
        setPosts((prev) => prev.map((post) => (post.id === newPost.id ? newPost : post)));
        break;
      case "DELETE":
        setPosts((prev) => prev.filter((post) => post.id !== oldPost.id));
        break;
      default:
        break;
    }
  };

  // Optionally re-fetch all posts from the server
  // if you want a manual refresh button or a fallback
  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setPosts(data as BlogPost[]);
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

  const checkAdminStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error checking admin status:", error);
    } else if (data && data.is_admin) {
      setIsAdmin(true);
    }
  };

  const deletePost = async (postId: string) => {
    if (!user || !isAdmin) {
      toaster.create({
        title: "Error",
        description: "Only admin users can delete blog posts.",
        type: "error",
        duration: 5000,
      });
      return;
    }

    const { error } = await supabase.from("blog_posts").delete().eq("id", postId);
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
        description: "Blog post deleted successfully.",
        type: "success",
        duration: 5000,
      });
      // Real-time subscription automatically removes the post from `posts`.
    }
  };

  if (loading) {
    return (
      <Center h="100vh">
        <ComicSpinner />
      </Center>
    );
  }

  return (
    <Container maxW="container.md" py={8}>
      <Flex justifyContent="space-between" mb={4}>
        {isAdmin && (
          <Button onClick={() => router.push("/blog/create")}>
            New Post
          </Button>
        )}
      </Flex>
      <VStack gap={4} align="stretch">
        {posts.map((post) => (
          <Box
            key={post.id}
            p={4}
            shadow="md"
            borderWidth="1px"
            display="flex"
            flexDirection={{ base: "column", md: "row" }}
            alignItems="center"
            _hover={{
              transform: "scale(1.05)",
              transition: "transform 0.3s",
              cursor: "pointer",
            }}
            onClick={() => router.push(`/blog/${post.id}`)}
          >
            {post.imageUrl && (
              <Image
                src={post.imageUrl}
                alt={post.title}
                maxW={{ base: "100%", md: "150px" }}
                objectFit="cover"
                mb={{ base: 4, md: 0 }}
                mr={{ md: 4 }}
              />
            )}
            <Box flex="1" textAlign="left">
              <Heading
                fontSize="1.5rem"
                fontFamily="Bangers, sans-serif"
                fontWeight="normal"
              >
                {post.title}
              </Heading>
              <Text fontSize="sm" color="gray.500" mb={2}>
                {new Intl.DateTimeFormat("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(post.created_at))}
              </Text>
              <Box lineClamp={3} className="ql-editor" dangerouslySetInnerHTML={{ __html: post.content }} />
              {isAdmin && (
                <Flex mt={4} justifyContent="flex-start">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation(); // prevent box onClick
                      router.push(`/blog/${post.id}/edit`);
                    }}
                    aria-label="Edit Post"
                    mr={2}><Pencil size={16} /></IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePost(post.id);
                    }}
                    aria-label="Delete Post"
                    colorPalette="red"><Trash2 size={16} /></IconButton>
                </Flex>
              )}
            </Box>
          </Box>
        ))}
      </VStack>
    </Container>
  );
}
