'use client';

import { useColorModeValue } from "@/components/ui/color-mode";
import React from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Center,
  Text,
  Heading,
  VStack,
  Separator } from "@chakra-ui/react";

export default function ConfirmForm() {
  const searchParams = useSearchParams();
  const message = searchParams?.get("message");

  // Extract the email part from the message if it follows the expected format
  const emailRegex = /Check email\((.+?)\)/;
  const emailMatch = message?.match(emailRegex);
  const email = emailMatch ? emailMatch[1] : "";

  return (
    <Center bg={useColorModeValue("gray.50", "gray.800")} minH="100vh">
      <Box
        p={8}
        maxWidth="500px"
        width="full"
        boxShadow="lg"
        borderRadius="lg"
        bg={useColorModeValue("white", "gray.700")}
      >
        <VStack gap={4}>
          <Heading as="h1" size="lg" color="green.600" textAlign="center">
            Confirmation Required
          </Heading>
          <Separator />
          <Text textAlign="center" fontSize="md" color="green.600">
            Check your email{" "}
            <span style={{ fontWeight: "bold" }}>{email}</span> to continue the sign-in process
          </Text>
          <Text textAlign="center" fontSize="sm" color="red.500">
            Please check your email for further instructions.
          </Text>
        </VStack>
      </Box>
    </Center>
  );
}
