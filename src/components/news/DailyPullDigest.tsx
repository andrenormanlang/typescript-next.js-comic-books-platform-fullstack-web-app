"use client";

import {
  Box,
  Heading,
  Text,
  Badge,
  Flex,
  SimpleGrid,
  Stack,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { useGetDigest } from "@/hooks/news/useGetDigest";
import { DispatchArticle } from "@/hooks/news/useGetTrendingNews";
import { DigestHighlight, DigestSource } from "@/types/news/digest.type";

interface DailyPullDigestProps {
  onOpenArticle: (article: DispatchArticle) => void;
}

// A digest source only carries a URL + title; build the minimal DispatchArticle that ArticleModal
// needs (it keys off `id` = the article URL to fetch the rewritten body).
function toDispatchArticle(source: DigestSource): DispatchArticle {
  return {
    id: source.url,
    title: source.title,
    description: "",
    pubDate: "",
    pubTS: 0,
    rssUrl: source.url,
  };
}

function formatCoverage(ts: number): string {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString("en-GB", {
    timeZone: "Europe/Stockholm",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface HighlightCardProps {
  highlight: DigestHighlight;
  onOpenArticle: (article: DispatchArticle) => void;
}

function HighlightCard({ highlight, onOpenArticle }: HighlightCardProps) {
  return (
    <Box
      bg="gray.800"
      borderWidth="1px"
      borderColor="gray.700"
      borderRadius="xl"
      p={5}
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <Flex gap={2} flexWrap="wrap">
        <Badge colorPalette="orange" borderRadius="full" px={2}>
          {highlight.publisher}
        </Badge>
        <Badge colorPalette="purple" borderRadius="full" px={2}>
          {highlight.topic}
        </Badge>
      </Flex>

      <Heading
        as="h3"
        size="md"
        color="white"
        fontFamily="var(--font-archivo-black), sans-serif"
        lineHeight="1.3"
      >
        {highlight.headline}
      </Heading>

      <Text fontSize="sm" color="gray.300" lineHeight="1.6">
        {highlight.summary}
      </Text>

      <Stack gap={1} mt="auto">
        {highlight.sources.map((source, i) => (
          <Box
            as="button"
            key={`${source.url}-${i}`}
            textAlign="left"
            fontSize="xs"
            color="orange.400"
            _hover={{ color: "orange.300", textDecoration: "underline" }}
            onClick={() => onOpenArticle(toDispatchArticle(source))}
          >
            → {source.title}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default function DailyPullDigest({ onOpenArticle }: DailyPullDigestProps) {
  const { data: digest, isLoading } = useGetDigest();

  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner size="lg" color="orange.400" />
      </Center>
    );
  }

  // No digest available → hide the section entirely; the grid below still renders.
  if (!digest || !digest.highlights?.length) return null;

  const coverage = formatCoverage(digest.coverageEndTS);

  return (
    <Box mb={10}>
      <Flex align="center" justify="space-between" gap={3} mb={4} flexWrap="wrap">
        <Heading
          as="h2"
          size="lg"
          color="white"
          fontFamily="'Bangers', cursive"
          letterSpacing="wider"
        >
          Daily Pull Digest
        </Heading>
        <Flex align="center" gap={2} flexWrap="wrap">
          <Badge colorPalette="orange" variant="solid">
            AI-generated
          </Badge>
          {coverage && (
            <Text fontSize="xs" color="gray.400" fontFamily="mono">
              as of {coverage} (Malmö)
            </Text>
          )}
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={5}>
        {digest.highlights.map((highlight, i) => (
          <HighlightCard
            key={i}
            highlight={highlight}
            onOpenArticle={onOpenArticle}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}
