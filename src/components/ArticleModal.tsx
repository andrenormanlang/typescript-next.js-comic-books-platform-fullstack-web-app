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
import { useGetArticle } from "@/hooks/news/useGetArticle";
import { DispatchArticle } from "@/hooks/news/useGetTrendingNews";

function extractImageUrl(html: string): string | null {
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

// Decode HTML entities (e.g. &#8230; → "…", &#8217; → "'") that RSS feeds
// leave encoded inside their description text.
function decodeEntities(text: string): string {
  if (typeof document === "undefined") return text;
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

function stripHtml(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return decodeEntities(withoutTags);
}

function sourceLabel(rssUrl: string): string {
  try {
    return new URL(rssUrl).hostname.replace(/^www\./, "");
  } catch {
    return rssUrl;
  }
}

interface ArticleModalProps {
  article: DispatchArticle | null;
  onClose: () => void;
}

export default function ArticleModal({ article, onClose }: ArticleModalProps) {
  const { data: processed, isLoading } = useGetArticle(article?.id ?? null);
  const isOpen = !!article;

  // Gallery: scraped images from the processed article, falling back to the
  // list item's images, then any single lead image / first <img> in the excerpt.
  const galleryImages =
    processed?.images && processed.images.length
      ? processed.images
      : article?.images && article.images.length
      ? article.images
      : [];
  const heroImage =
    galleryImages[0] ??
    article?.imageUrl ??
    processed?.imageUrl ??
    (article?.description ? extractImageUrl(article.description) : null);
  // Remaining shots shown as a grid below the body (hero is rendered up top).
  const restImages = galleryImages.filter((url) => url !== heroImage);
  const imageUrl = heroImage;
  // Prefer the AI-rephrased lead; fall back to the (now entity-decoded) excerpt.
  const plainDescription =
    processed?.rephrasedDescription?.trim() ||
    (article?.description ? stripHtml(article.description) : null);
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
              {imageUrl && (
                <Image
                  src={imageUrl}
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
              ) : (
                <Text color="gray.500" fontStyle="italic" fontSize="sm">
                  Full article rewrite not yet available.
                </Text>
              )}

              {restImages.length > 0 && (
                <Box
                  mt={6}
                  display="grid"
                  gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))"
                  gap={3}
                >
                  {restImages.map((src) => (
                    <Image
                      key={src}
                      src={src}
                      alt={article?.title}
                      w="100%"
                      borderRadius="md"
                      objectFit="cover"
                      loading="lazy"
                    />
                  ))}
                </Box>
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
