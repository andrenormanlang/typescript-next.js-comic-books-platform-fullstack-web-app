"use client";

import { useState, useMemo } from "react";
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
  Input,
} from "@chakra-ui/react";
import ArticleModal from "./ArticleModal";

const SOURCE_COLORS: Record<string, string> = {
  "bleedingcool.com": "red",
  "comicbookherald.com": "green",
  "cbr.com": "purple",
  "comicsbeat.com": "blue",
  "icv2.com": "orange",
  "aiptcomics.com": "teal",
  "multiversitycomics.com": "cyan",
  "dccomicsnews.com": "blue",
  "gamesradar.com": "pink",
  "superherohype.com": "yellow",
  "comicbookroundup.com": "gray",
};

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

function formatDate(pubTS?: number, pubDate?: string): string {
  if (pubTS) {
    return new Date(pubTS * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return pubDate ?? "";
}

interface ArticleCardProps {
  article: DispatchArticle;
  onClick: (article: DispatchArticle) => void;
}

function ArticleCard({ article, onClick }: ArticleCardProps) {
  const source = sourceLabel(article.rssUrl);
  const colorScheme = SOURCE_COLORS[source] ?? "gray";
  const imageUrl =
    article.imageUrl ?? (article.description ? extractImageUrl(article.description) : null);
  const plainDescription = article.description ? stripHtml(article.description) : null;
  const date = formatDate(article.pubTS, article.pubDate);

  return (
    <Box
      borderRadius="xl"
      overflow="hidden"
      bg="gray.800"
      borderWidth="1px"
      borderColor="gray.700"
      cursor="pointer"
      role="button"
      tabIndex={0}
      onClick={() => onClick(article)}
      onKeyDown={(e) => e.key === "Enter" && onClick(article)}
      _hover={{ borderColor: "orange.400", shadow: "lg", transform: "translateY(-2px)" }}
      transition="all 0.2s"
      display="flex"
      flexDirection="column"
    >
      {/* Image */}
      <Box h="200px" bg="gray.700" overflow="hidden" flexShrink={0}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={article.title}
            w="100%"
            h="100%"
            objectFit="cover"
            transition="transform 0.3s"
            _groupHover={{ transform: "scale(1.05)" }}
          />
        ) : (
          <Center h="100%" bg="gray.700">
            <Text fontSize="4xl">📰</Text>
          </Center>
        )}
      </Box>

      {/* Content */}
      <Box p={5} flex="1" display="flex" flexDirection="column" gap={3}>
        {/* Source + Date row */}
        <Flex align="center" justify="space-between" gap={2} flexWrap="wrap">
          <Badge colorPalette={colorScheme} size="sm" px={2} py={0.5} borderRadius="full">
            {source}
          </Badge>
          <Text fontSize="xs" color="gray.400" fontFamily="mono">
            {date}
          </Text>
        </Flex>

        {/* Title */}
        <Heading
          as="h3"
          size="md"
          fontFamily="'Bangers', cursive"
          letterSpacing="wide"
          lineHeight="1.3"
          color="white"
          _groupHover={{ color: "orange.300" }}
        >
          {article.title}
        </Heading>

        {/* Description */}
        {plainDescription && (
          <Text fontSize="sm" color="gray.400" lineClamp={3} flex="1">
            {plainDescription}
          </Text>
        )}

        {/* Footer */}
        <Text fontSize="xs" color="orange.400" mt="auto">
          Click to read rewritten article →
        </Text>
      </Box>
    </Box>
  );
}

export default function ComicsNewsClient() {
  const { data: articles, isLoading, isError } = useGetTrendingNews();
  const [selected, setSelected] = useState<DispatchArticle | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!articles) return [];
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => {
      const title = (a.title ?? "").toLowerCase();
      const desc = stripHtml(a.description ?? "").toLowerCase();
      const source = sourceLabel(a.rssUrl).toLowerCase();
      return title.includes(q) || desc.includes(q) || source.includes(q);
    });
  }, [articles, search]);

  if (isLoading) {
    return (
      <Center h="60vh">
        <Spinner size="xl" color="orange.400" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h="60vh">
        <Text color="gray.500">Failed to load news. Please try again later.</Text>
      </Center>
    );
  }

  return (
    <Box px={{ base: 4, md: 8 }} py={8} maxW="7xl" mx="auto">
      {/* Header */}
      <Box mb={8} textAlign="center">
        <Heading
          fontFamily="'Bangers', cursive"
          fontSize={{ base: "4xl", md: "6xl" }}
          letterSpacing="wider"
          color="white"
          mb={1}
        >
          Comics News
        </Heading>
        <Text color="gray.400" fontSize="sm" mb={6}>
          {articles?.length ?? 0} articles from {new Set(articles?.map((a) => sourceLabel(a.rssUrl))).size ?? 0} sources
        </Text>

        {/* Search */}
        <Box position="relative" maxW="lg" mx="auto">
          <Box
            position="absolute"
            left={4}
            top="50%"
            transform="translateY(-50%)"
            color="gray.400"
            pointerEvents="none"
            zIndex={1}
            fontSize="md"
          >
            🔍
          </Box>
          <Input
            placeholder="Search by title, source or topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg="gray.800"
            borderColor="gray.600"
            color="white"
            pl={10}
            borderRadius="xl"
            _placeholder={{ color: "gray.500" }}
            _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)" }}
            size="lg"
          />
        </Box>
      </Box>

      {/* Results count when searching */}
      {search && (
        <Text color="gray.500" fontSize="sm" mb={4}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
        </Text>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <Center h="40vh">
          <Text color="gray.500">
            {search ? `No articles matching "${search}"` : "No news available right now."}
          </Text>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
          {filtered.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={setSelected}
            />
          ))}
        </SimpleGrid>
      )}

      <ArticleModal article={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
