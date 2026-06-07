'use client';

import { useColorModeValue } from "@/components/ui/color-mode";
import { useRouter, useParams } from "next/navigation"; // Import useParams
import { useEffect, useState } from "react"; // Removed 'use'
import { supabase } from "@/utils/supabaseClient";
import {Avatar, Dialog,
  Box,
  Spinner,
  Heading,
  Text,
  Button,
  VStack, Center,
  Container, Table, HStack,
  Tooltip,
  Flex, useDisclosure,
  Portal,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { Forum, Topic } from "@/types/forum/forum.type"; // Removed Params import
import { useUser } from "@/contexts/UserContext";
import { Trash2 } from "lucide-react";
import { getRelativeTime } from "@/helpers/getRelativeTime";

const ForumPage = () => { // Removed props parameter
  const params = useParams(); // Correct usage of useParams
  const { id, topicId } = params; // Destructure 'id' and 'topicId' if needed
  const [forum, setForum] = useState<Forum | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const router = useRouter();
  const { open: isOpen, onOpen, onClose } = useDisclosure();

  const cardBg = useColorModeValue("white", "gray.700");
  const cardText = useColorModeValue("gray.800", "white");
  const cardHover = useColorModeValue("gray.100", "gray.600");
  const cardBorder = useColorModeValue("gray.200", "gray.500");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
        if (error) {
          console.error("Error fetching profile:", error.message);
          return;
        }
        if (data && data.is_admin) {
          setIsAdmin(true);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const fetchForum = async () => {
      const { data, error } = await supabase
        .from("forums")
        .select("*")
        .eq("id", id)
        .single();
      if (error) console.error("Error fetching forum:", error);
      else setForum(data);
    };

    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from("topics")
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq("forum_id", id);
      if (error) {
        console.error("Error fetching topics:", error);
      } else {
        const enrichedTopics = await Promise.all(
          data.map(async (topic) => {
            const { data: postsSnapshot, error: postsError } = await supabase
              .from("posts")
              .select("*, profiles (username)")
              .eq("topic_id", topic.id);

            if (postsError) {
              console.error("Error fetching posts:", postsError);
              return topic;
            }

            const postCountsTemp = postsSnapshot?.length || 0;
            const voiceCountsTemp = new Set(
              postsSnapshot?.map((post) => post.profiles?.username).filter((username) => username)
            ).size;
            const lastPostTime = postsSnapshot?.length
              ? getRelativeTime(postsSnapshot[postsSnapshot.length - 1].created_at)
              : "No posts";

            return {
              ...topic,
              postCount: postCountsTemp,
              voiceCount: voiceCountsTemp,
              lastPostTime,
            };
          })
        );
        setTopics(enrichedTopics);
      }
      setLoading(false);
    };

    if (id) {
      fetchForum();
      fetchTopics();
    }
  }, [id]);

  const handleDelete = async () => {
    if (!topicToDelete) return;

    const topic = topics.find((t) => t.id === topicToDelete);

    if (topic && (topic.postCount || 0) > 0) {
      toaster.create({
        title: "Error",
        description: "You can't delete topics that have posts. Please delete all posts first.",
        type: "error",
        duration: 5000,
      });
      return;
    }

    try {
      const { error } = await supabase.from("topics").delete().eq("id", topicToDelete);
      if (error) throw error;
      setTopics((prevTopics) => prevTopics.filter((topic) => topic.id !== topicToDelete));
      toaster.create({
        title: "Topic deleted.",
        description: "The topic has been deleted successfully.",
        type: "success",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error deleting topic:", error);
      toaster.create({
        title: "Error",
        description: "There was an error deleting the topic.",
        type: "error",
        duration: 5000,
      });
    } finally {
      setTopicToDelete(null);
      onClose();
    }
  };

  const openDeleteModal = (topicId: string) => {
    setTopicToDelete(topicId);
    onOpen();
  };

  const handleCreateTopic = () => {
    if (!user) {
      toaster.create({
        title: "Error",
        description: "You need to be signed in to create a topic.",
        type: "error",
        duration: 5000,
      });
      return;
    }
    router.push(`/forums/${id}/create-topic`);
  };

  if (loading)
    return (
      <Center height="100vh">
        <Spinner size="xl" />
      </Center>
    );

  if (!forum) return <Text>Forum not found</Text>;

  return (
    <Container maxW="container.lg" py={8}>
      <Heading mb={4} textAlign="center">
        {forum.title}
      </Heading>
      <Text mb={8} textAlign="center">
        {forum.description}
      </Text>
      <Flex justify="space-between" mb={4}>
        <Button colorPalette="teal" onClick={() => router.push(`/forums`)}>
          Back to Forums
        </Button>
        <Button colorPalette="teal" onClick={handleCreateTopic}>
          Create Topic
        </Button>
      </Flex>
      <Box overflowX="auto">
        <Table.Root variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Topic</Table.ColumnHeader>
              <Table.ColumnHeader>Author</Table.ColumnHeader>
              <Table.ColumnHeader>Created At</Table.ColumnHeader>
              <Table.ColumnHeader>Voices</Table.ColumnHeader>
              <Table.ColumnHeader>Posts</Table.ColumnHeader>
              <Table.ColumnHeader>Freshness</Table.ColumnHeader>
              {isAdmin && <Table.ColumnHeader>Delete</Table.ColumnHeader>}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {topics.map((topic) => (
              <Table.Row key={topic.id}>
                <Table.Cell>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <a
                        href={`/forums/${forum.id}/topics/${topic.id}`}
                        style={{ fontWeight: "bold" }}
                      >
                        {topic.title}
                      </a>
                    </Tooltip.Trigger>
                    <Tooltip.Content>{topic.description}</Tooltip.Content>
                  </Tooltip.Root>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={3}>
                    {topic.profiles && (
                      <>
                        <Avatar.Root size="sm"><Avatar.Image src={topic.profiles.avatar_url} /><Avatar.Fallback /></Avatar.Root>
                        <Text>{topic.profiles.username}</Text>
                      </>
                    )}
                  </HStack>
                </Table.Cell>
                <Table.Cell>{new Date(topic.created_at).toLocaleDateString()}</Table.Cell>
                <Table.Cell>{topic.voiceCount}</Table.Cell>
                <Table.Cell>{topic.postCount}</Table.Cell>
                <Table.Cell>{topic.lastPostTime}</Table.Cell>
                {isAdmin && (
                  <Table.Cell>
                    <Button colorPalette="red" size="sm" onClick={() => openDeleteModal(topic.id)}>
                      <Trash2 />
                    </Button>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && (onClose)()}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header><Dialog.Title>Delete Topic</Dialog.Title></Dialog.Header>
              <Dialog.CloseTrigger />
              <Dialog.Body>
                <Text>Are you sure you want to delete this topic?</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button colorPalette="red" mr={3} onClick={handleDelete}>
                  Yes, Delete
                </Button>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Container>
  );
};

export default ForumPage;


