"use client";

import { useState, useEffect } from "react";
import {
  SimpleGrid,
  Box,
  Image,
  Text,
  Container,
  Center,
  Spinner,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { htmlToText } from "html-to-text";
import SearchBox from "@/components/SearchBox";
import ComicsPagination from "@/components/ComicsPagination";
import { useSearchParameters } from "@/hooks/useSearchParameters";
import { useGetComicVineIssues } from "@/hooks/comic-vine/useComicVine";
import { ComicVine, SearchQuery } from "@/types/comic.types";

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const ComicVineIssuesClient = () => {
  const pageSize = 15;
  const maxDescriptionLength = 100;
  const router = useRouter();

  const {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    updateUrl,
  } = useSearchParameters(1, "");

  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    page: 1,
    query: "",
  });

  const { data, isLoading, isError, error } = useGetComicVineIssues(
    searchTerm,
    currentPage,
    pageSize
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSearchQuery({ ...searchQuery, page });
    updateUrl(searchTerm, page);
  };

  const handleSearchTerm = useDebouncedCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    updateUrl(term, 1);
    setSearchQuery({ ...searchQuery, query: term, page: 1 });
  }, 300);

  // Update URL parameters when searchTerm or currentPage changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());
    if (searchTerm) {
      url.searchParams.set("query", searchTerm);
    } else {
      url.searchParams.delete("query");
    }
    router.push(url.toString(), undefined);
  }, [searchTerm, currentPage, router]);

  // Initialize currentPage from URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const page = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(page) && page > 0) {
      setCurrentPage(page);
    }
  }, [setCurrentPage]);

  const validData = data?.results.slice(0);

  if (isLoading) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (isError) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontFamily: '"Bangers", cursive',
          fontSize: "1.5rem",
          color: "red",
          textAlign: "center",
          padding: "20px",
          backgroundColor: "#f0f0f0",
          borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
        }}
      >
        Error: {error.message}
      </div>
    );
  }

  return (
    <Container maxW="container.xl" centerContent p={4}>
      <SearchBox onSearch={handleSearchTerm} />
      {data && (
        <Box>
          <Text fontSize="1.5em" mb={4} textAlign="center">
            {searchTerm
              ? `You have ${data.number_of_total_results} results for "${searchTerm}" in ${Math.ceil(
                  data.number_of_total_results / data.limit
                )} pages`
              : `You have a total of ${data.number_of_total_results} issues from Comic Vine in ${Math.ceil(
                  data.number_of_total_results / data.limit
                )} pages`}
          </Text>
        </Box>
      )}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={10} width="100%">
        {validData?.map((comic: ComicVine) => {
          const plainDescription = htmlToText(comic.description || "", {
            wordwrap: 130,
          });
          const truncatedDescription =
            plainDescription.length > maxDescriptionLength
              ? plainDescription.substring(0, maxDescriptionLength) + "..."
              : plainDescription;

          return (
            <NextLink
              href={`/search/comic-vine/issues/${comic.id}?page=${currentPage}&query=${searchTerm}`}
              passHref
              key={comic.id}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                style={{
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                <Box
                  boxShadow="0 4px 8px rgba(0,0,0,0.1)"
                  rounded="md"
                  overflow="hidden"
                  p={4}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="space-between"
                  minH="630px"
                  position="relative"
                >
                  <Image
                    src={comic.image.original_url}
                    alt={comic.name || `Comic ${comic.id}`}
                    maxW="400px"
                    maxH="400px"
                    objectFit="contain"
                  />
                  <Text
                    fontWeight="bold"
                    fontSize="lg"
                    lineClamp={1}
                    textAlign="center"
                    mt={4}
                  >
                    {comic.volume.name} #{comic.issue_number}
                  </Text>
                  <Text
                    fontSize="sm"
                    color="gray.500"
                    textAlign="center"
                  >
                    Release Date: {formatDate(comic.store_date)}
                  </Text>
                  <Text
                    fontSize="sm"
                    color="gray.500"
                    textAlign="left"
                    mt={2}
                    p={4}
                  >
                    {truncatedDescription}
                  </Text>
                </Box>
              </motion.div>
            </NextLink>
          );
        })}
      </SimpleGrid>
      <div style={{ marginTop: "2rem" }}>
        <ComicsPagination
          currentPage={currentPage}
          totalPages={Math.ceil(data.number_of_total_results / data.limit)}
          onPageChange={handlePageChange}
        />
      </div>
    </Container>
  );
};

export default ComicVineIssuesClient;
