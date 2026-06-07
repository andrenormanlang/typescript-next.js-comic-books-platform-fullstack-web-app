"use client";

import { useRouter } from "next/navigation";
import { Center, Box, Heading, Text, Button } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";

export default function AuthError() {
  const router = useRouter();

  // Use useColorModeValue to set colors based on the current theme
  const bgCenter = useColorModeValue("gray.50", "gray.900");
  const bgBox = useColorModeValue("white", "gray.700");
  const textColor = useColorModeValue("black", "white");

  return (
    <Center bg={bgCenter}>
      <Box
        p={8}
        maxWidth="400px"
        width="full"
        bg={bgBox}
        boxShadow="md"
        borderRadius="md"
        textAlign="center"
      >
        <Heading as="h1" size="lg" mb={6} color="red.500">
          Session Expired
        </Heading>
        <Text mb={4} color={textColor}>
          Your session has expired. Please sign up again to continue.
        </Text>
        <Button colorPalette="teal" onClick={() => router.push("/auth/signup")}>
          Sign Up
        </Button>
      </Box>
    </Center>
  );
}

