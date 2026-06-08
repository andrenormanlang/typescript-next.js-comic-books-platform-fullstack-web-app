"use client";

import { useState } from "react";
import { useGetTrendingNews, DispatchArticle } from "@/hooks/news/useGetTrendingNews";
import {
  Spinner,
  Center,
  SimpleGrid,
  Box,
  Text,
  Badge,
  Heading,
  Flex,
  Image,
} from "@chakra-ui/react";
import ArticleModal from "./ArticleModal";

function sourceLabel(rssUrl: string): string {
  try {
    return new URL(rssUrl).hostname.replace(/^www\./, "");
  } catch {
    return rssUrl;
  }
}

function extractImageUrl(html: string): string | null {
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

interface ArticleCardProps {
  article: DispatchArticle;
  onClick: (article: DispatchArticle) => void;
}

function ArticleCard({ article, onClick }: ArticleCardProps) {
  const likeCount = article.likes?.users?.length ?? 0;
  const commentCount = article.msgCount ?? 0;
  const pubDate = article.pubTS
    ? new Date(article.pubTS * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : article.pubDate;

  const imageUrl =
    article.imageUrl ?? (article.description ? extractImageUrl(article.description) : null);
  const plainDescription = article.description ? stripHtml(article.description) : null;

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      _hover={{ borderColor: "blue.400", shadow: "md", cursor: "pointer" }}
      transition="all 0.2s"
      display="flex"
      flexDirection="column"
      onClick={() => onClick(article)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(article)}
    >
      {imageUrl && (
        <Image src={imageUrl} alt={article.title} w="100%" h="160px" objectFit="cover" />
      )}

      <Box p={4} flex="1" display="flex" flexDirection="column">
        <Flex justify="space-between" align="center" mb={2}>
          <Badge colorScheme="blue" fontSize="xs">
            {sourceLabel(article.rssUrl)}
          </Badge>
          <Text fontSize="xs" color="gray.500">
            {pubDate}
          </Text>
        </Flex>

        <Heading
          as="h3"
          size="sm"
          fontFamily="'Bangers', cursive"
          mb={2}
          lineHeight="1.3"
          _hover={{ color: "blue.400" }}
        >
          {article.title}
        </Heading>

        {plainDescription && (
          <Text fontSize="sm" color="gray.400" noOfLines={3} mb={3} flex="1">
            {plainDescription}
          </Text>
        )}

        <Flex gap={3} fontSize="xs" color="gray.500" mt="auto">
          {likeCount > 0 && <Text>👍 {likeCount}</Text>}
          {commentCount > 0 && <Text>💬 {commentCount}</Text>}
        </Flex>
      </Box>
    </Box>
  );
}

export default function ComicsNewsClient() {
  const { data: articles, isLoading, isError } = useGetTrendingNews();
  const [selected, setSelected] = useState<{ url: string; rssUrl: string } | null>(null);

  if (isLoading) {
    return (
      <Center h="40vh">
        <Spinner size="xl" color="blue.400" />
      </Center>
    );
  }

  if (isError || !articles?.length) {
    return (
      <Center h="40vh">
        <Text color="gray.500">No news available right now.</Text>
      </Center>
    );
  }

  return (
    <Box p={6}>
      <Heading fontFamily="'Bangers', cursive" fontSize="4xl" mb={6} letterSpacing="wide">
        Comics News
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onClick={(a) => setSelected({ url: a.id, rssUrl: a.rssUrl })}
          />
        ))}
      </SimpleGrid>

      <ArticleModal
        articleUrl={selected?.url ?? null}
        rssUrl={selected?.rssUrl ?? null}
        onClose={() => setSelected(null)}
      />
    </Box>
  );
}
