"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { Box, Text, Heading, IconButton, Accordion, Tooltip } from '@chakra-ui/react';
import { toaster } from "@/components/ui/toaster";
import { Copy } from 'lucide-react';
import copy from 'copy-to-clipboard';
import withAuth from '@/utils/withAuth'; 

const AccessTokenDisplay = () => {
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const bg = useColorModeValue('gray.100', 'gray.700');
  const color = useColorModeValue('black', 'white');

  const handleCopy = () => {
    if (accessToken) {
      copy(accessToken);
      toaster.create({
        title: 'Access Token Copied',
        description: 'The access token has been copied to your clipboard.',
        type: 'success',
        duration: 3000,
      });
    } else {
      toaster.create({
        title: 'No Access Token',
        description: 'There is no access token to copy.',
        type: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Box
      p={6}
      bg={bg}
      borderRadius="md"
      boxShadow="md"
      maxWidth="400px"
      mx="auto"
      mt={8}
      textAlign="center"
    >
      <Accordion.Root >
        <Accordion.Item value="access-token">
          <Heading as="h2" size="lg" mb={4} color={color}>
            <Accordion.ItemTrigger>
              Access Token
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <IconButton
                    aria-label="Copy access token"
                    onClick={handleCopy}
                    colorPalette="teal"
                    variant="outline"
                    size="sm"
                    mr={2}><Copy size={16} /></IconButton>
                </Tooltip.Trigger>
                <Tooltip.Content>Copy Token</Tooltip.Content>
              </Tooltip.Root>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
          </Heading>
          <Accordion.ItemContent pb={4}>
            <Text color={color} wordBreak="break-all">
              {accessToken || 'No access token available'}
            </Text>
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>
    </Box>
  );
};

export default withAuth(AccessTokenDisplay);
