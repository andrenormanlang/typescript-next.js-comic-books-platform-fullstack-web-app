"use client";

import {
  Dialog,
  Portal,
  Box,
  Text,
  Badge,
  Link,
  Image,
  Spinner,
  Center,
  Flex,
  CloseButton,
} from "@chakra-ui/react";
import DOMPurify from "dompurify";
import { useGetArticle } from "@/hooks/news/useGetArticle";
import { DispatchArticle } from "@/hooks/news/useGetTrendingNews";
import { stripHtml, extractImageUrl, sourceLabel } from "@/helpers/news/text";

// Sanitize raw RSS description HTML for safe rendering as a fallback when no AI
// rewrite exists. Browser-only (DOMPurify needs `window`); returns null on the
// server, where this fallback branch never renders anyway (modal is client-driven).
function sanitizeDescriptionHtml(html?: string | null): string | null {
  if (!html || typeof window === "undefined") return null;
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return clean.trim() || null;
}

interface ArticleModalProps {
  article: DispatchArticle | null;
  onClose: () => void;
}

export default function ArticleModal({ article, onClose }: ArticleModalProps) {
  const { data: processed, isLoading } = useGetArticle(article?.id ?? null);
  const isOpen = !!article;

  const hasRewrite = !!processed?.rwBody;
  // When there's no AI rewrite (e.g. the backend couldn't scrape the source),
  // fall back to the original RSS description HTML so the reader still gets the
  // article's content and inline image instead of an empty "not available" note.
  const descriptionHtml =
    !hasRewrite && !isLoading ? sanitizeDescriptionHtml(article?.description) : null;

  const imageUrl =
    article?.imageUrl ??
    (article?.description ? extractImageUrl(article.description) : null);
  // The fallback HTML carries its own inline image, so suppress the standalone
  // header image in that case to avoid showing it twice.
  const showTopImage = !!imageUrl && !descriptionHtml;
  // Prefer the AI-rephrased lead; fall back to the (now entity-decoded) excerpt.
  // Hide the plain lead when we're rendering the full description HTML below
  // (it would just duplicate the same text).
  const plainDescription =
    processed?.rephrasedDescription?.trim() ||
    (article?.description ? stripHtml(article.description) : null);
  const showLead = !!plainDescription && !descriptionHtml;
  const pubDate = article?.pubTS
    ? new Date(article.pubTS * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : article?.pubDate;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => { if (!e.open) onClose(); }}
      size="lg"
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="gray.900" color="white">
            <Dialog.Header>
              <Dialog.Title
                fontFamily="var(--font-archivo-black), sans-serif"
                fontSize="2xl"
                letterSpacing="normal"
                lineHeight="1.3"
                pr={8}
              >
                {processed?.rephrasedTitle ?? article?.title ?? ""}
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild>
              <CloseButton position="absolute" top={3} right={3} />
            </Dialog.CloseTrigger>

            <Dialog.Body pb={8}>
              {showTopImage && (
                <Image
                  src={imageUrl!}
                  alt={article?.title}
                  w="100%"
                  borderRadius="lg"
                  mb={4}
                  objectFit="cover"
                  maxH="320px"
                />
              )}

              <Flex gap={3} align="center" mb={4} flexWrap="wrap">
                {article?.rssUrl && (
                  <Badge colorScheme="blue" fontSize="sm">
                    {sourceLabel(article.rssUrl)}
                  </Badge>
                )}
                {pubDate && (
                  <Text fontSize="sm" color="gray.400">
                    {pubDate}
                  </Text>
                )}
              </Flex>

              {showLead && (
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

              {isLoading ? (
                <Center py={6}>
                  <Spinner size="md" color="blue.400" />
                </Center>
              ) : processed?.rwBody ? (
                <Text
                  color="gray.300"
                  lineHeight="1.9"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                >
                  {processed.rwBody}
                </Text>
              ) : descriptionHtml ? (
                <Box
                  color="gray.300"
                  lineHeight="1.9"
                  fontSize="sm"
                  css={{
                    "& p": { marginBottom: "1rem" },
                    "& img": {
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "0.5rem",
                      margin: "0.75rem 0",
                    },
                    "& a": { color: "var(--chakra-colors-blue-400)", textDecoration: "underline" },
                  }}
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <Text color="gray.500" fontStyle="italic" fontSize="sm">
                  Full article rewrite not yet available.
                </Text>
              )}

              {article?.id && (
                <Link
                  href={article.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  mt={6}
                  display="inline-block"
                  color="blue.400"
                  fontSize="sm"
                  _hover={{ color: "blue.300", textDecoration: "underline" }}
                >
                  Read original article →
                </Link>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
