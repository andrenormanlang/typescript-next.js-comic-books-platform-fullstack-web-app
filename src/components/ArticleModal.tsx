"use client";

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Box,
  Text,
  Heading,
  Badge,
  Link,
  Image,
  Spinner,
  Center,
  Flex,
} from "@chakra-ui/react";
import { useGetArticle } from "@/hooks/news/useGetArticle";

function extractImageUrl(html: string): string | null {
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function sourceLabel(rssUrl: string): string {
  try {
    return new URL(rssUrl).hostname.replace(/^www\./, "");
  } catch {
    return rssUrl;
  }
}

interface ArticleModalProps {
  articleUrl: string | null;
  rssUrl: string | null;
  onClose: () => void;
}

export default function ArticleModal({ articleUrl, rssUrl, onClose }: ArticleModalProps) {
  const { data: article, isLoading } = useGetArticle(articleUrl, rssUrl);
  const isOpen = !!articleUrl;

  const imageUrl =
    article?.imageUrl ??
    (article?.description ? extractImageUrl(article.description) : null);
  const plainDescription = article?.description ? stripHtml(article.description) : null;
  const pubDate = article?.pubTS
    ? new Date(article.pubTS * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : article?.pubDate;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
      <ModalContent bg="gray.900" color="white" mx={4} borderRadius="xl">
        <ModalHeader
          fontFamily="'Bangers', cursive"
          fontSize="2xl"
          letterSpacing="wide"
          pr={10}
          lineHeight="1.3"
        >
          {article?.title ?? (isLoading ? "Loading…" : "Article")}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={8}>
          {isLoading && (
            <Center py={12}>
              <Spinner size="xl" color="blue.400" />
            </Center>
          )}
          {article && (
            <Box>
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt={article.title}
                  w="100%"
                  borderRadius="lg"
                  mb={4}
                  objectFit="cover"
                  maxH="320px"
                />
              )}

              <Flex gap={3} align="center" mb={4} flexWrap="wrap">
                <Badge colorScheme="blue" fontSize="sm">
                  {sourceLabel(article.rssUrl)}
                </Badge>
                {pubDate && (
                  <Text fontSize="sm" color="gray.400">
                    {pubDate}
                  </Text>
                )}
              </Flex>

              {plainDescription && (
                <Text
                  fontWeight="semibold"
                  fontSize="md"
                  mb={5}
                  color="gray.200"
                  lineHeight="1.7"
                >
                  {plainDescription}
                </Text>
              )}

              {article.rwBody ? (
                <Text color="gray.300" lineHeight="1.9" fontSize="sm" whiteSpace="pre-wrap">
                  {article.rwBody}
                </Text>
              ) : (
                <Text color="gray.500" fontStyle="italic" fontSize="sm">
                  Full article rewrite not yet available.
                </Text>
              )}

              <Link
                href={article.id}
                isExternal
                mt={6}
                display="inline-block"
                color="blue.400"
                fontSize="sm"
                _hover={{ color: "blue.300", textDecoration: "underline" }}
              >
                Read original article →
              </Link>
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
