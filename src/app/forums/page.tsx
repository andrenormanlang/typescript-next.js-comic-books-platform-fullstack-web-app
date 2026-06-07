"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Box, Spinner, SimpleGrid, Heading, Text, Button, Image, VStack, Center, Container, Badge, Flex } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { Forum } from "@/types/forum/forum.type";
import { getRelativeTime } from "@/helpers/getRelativeTime";

const ForumList = () => {
    const [forums, setForums] = useState<Forum[]>([]);
    const [forumDetails, setForumDetails] = useState<Record<string, { topicCount: number; postCount: number; lastUpdated: string }>>({});
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const cardBg = useColorModeValue('white', 'gray.700');
    const cardText = useColorModeValue('gray.800', 'white');
    const cardHover = useColorModeValue('gray.100', 'gray.600');

    useEffect(() => {
        const fetchForums = async () => {
            const { data: forumsData, error: forumsError } = await supabase.from("forums").select("*");
            if (forumsError) {
                console.error("Error fetching forums:", forumsError);
                setLoading(false);
                return;
            }

            const forumDetailsTemp: Record<string, { topicCount: number; postCount: number; lastUpdated: string }> = {};

            const forumFetchPromises = forumsData.map(async (forum: Forum) => {
                const { data: topicsData, error: topicsError } = await supabase
                    .from("topics")
                    .select("id, created_at")
                    .eq("forum_id", forum.id);

                if (topicsError) {
                    console.error("Error fetching topics:", topicsError);
                    return;
                }

                const topicCount = topicsData.length;
                let postCount = 0;
                let lastUpdated = "No posts";

                if (topicCount > 0) {
                    const topicIds = topicsData.map(topic => topic.id);
                    const { data: postsData, error: postsError } = await supabase
                        .from("posts")
                        .select("created_at")
                        .in("topic_id", topicIds)
                        .order("created_at", { ascending: false });

                    if (postsError) {
                        console.error("Error fetching posts:", postsError);
                        return;
                    }

                    postCount = postsData.length;

                    if (postsData.length > 0) {
                        lastUpdated = getRelativeTime(new Date(postsData[0].created_at));
                    }
                }

                forumDetailsTemp[forum.id] = { topicCount, postCount, lastUpdated };
            });

            await Promise.all(forumFetchPromises);
            setForums(forumsData);
            setForumDetails(forumDetailsTemp);
            setLoading(false);
        };

        fetchForums();
    }, []);

    if (loading) return (
        <Center height="100vh">
            <Spinner size="xl" />
        </Center>
    );

    return (
        <Container maxW="container.xl" py={8}>
            <SimpleGrid columns={{ sm: 1, md: 2, lg: 3 }} gap={6}>
                {forums.map((forum) => (
                    <Box
                        key={forum.id}
                        p={0}
                        shadow="md"
                        borderWidth="1px"
                        borderRadius="md"
                        overflow="hidden"
                        bg={cardBg}
                        _hover={{ shadow: "xl", bg: cardHover }}
                        transition="all 0.3s ease-in-out"
                        display="flex"
                        flexDirection="column"
                        height="100%"
                    >
                        <Box height="200px" width="100%" overflow="hidden">
                            <Image
                                src={forum.image || 'https://via.placeholder.com/400x200?text=Forum'}
                                alt={forum.title}
                                objectFit="cover"
                                height="100%"
                                width="100%"
                            />
                        </Box>
                        <Flex direction="column" justify="space-between" flex="1" p={5}>
                            <VStack gap={4} align="stretch" flex="1">
                                <Heading fontSize="xl">{forum.title}</Heading>
                                <Text>{forum.description}</Text>
                                <Box mt="auto">
									<VStack align="initial">

                                    <Badge colorPalette="teal" mb={1} variant="subtle" color={cardText}>Topics: {forumDetails[forum.id]?.topicCount || 0}</Badge>

                                    <Badge colorPalette="blue" mb={1} variant="subtle" color={cardText}>Posts: {forumDetails[forum.id]?.postCount || 0}</Badge>

                                    <Badge colorPalette="black" mb={1} variant="subtle" color={cardText}>Last Updated: {forumDetails[forum.id]?.lastUpdated || "No posts"}</Badge>
									</VStack>
                                </Box>
                            </VStack>
                            <Button mt={4} width="full" colorPalette="teal" onClick={() => router.push(`/forums/${forum.id}`)}>
                                View Topics
                            </Button>
                        </Flex>
                    </Box>
                ))}
            </SimpleGrid>
        </Container>
    );
};

export default ForumList;
