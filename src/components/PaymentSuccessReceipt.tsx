"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {List, 
  Box,
  Spinner,
  Text,
  Center, Heading,
  Stack,
  Separator,
  Image, Badge,
  Button,
} from '@chakra-ui/react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PaymentSuccessReceipt = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId');
  const userId = searchParams?.get('userId');
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Define color variables for light and dark modes
  const bg = useColorModeValue('gray.50', 'gray.800');
  const textColor = useColorModeValue('black', 'white');
  const headingColor = useColorModeValue('gray.900', 'gray.100');
  const totalColor = useColorModeValue('teal.500', 'teal.200');
  const badgeBg = useColorModeValue('blue.100', 'blue.700');
  const badgeColor = useColorModeValue('blue.800', 'blue.200');

  useEffect(() => {
    const fetchReceiptDetails = async () => {
      if (!orderId || !userId) return;

      try {
        const response = await fetch(`/api/payment-success?orderId=${orderId}&userId=${userId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setReceipt(data.receipt);
          console.log('Receipt Details:', data.receipt);

          // Dispatch a custom event to clear the cart
          const event = new CustomEvent('paymentSuccess', {
            detail: { userId },
          });
          window.dispatchEvent(event);
        }
      } catch (err) {
        setError('Failed to fetch receipt details');
      } finally {
        setLoading(false);
      }
    };

    fetchReceiptDetails();
  }, [orderId, userId]);

  if (loading) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center height="100vh">
        <Text color="red.500">{error}</Text>
      </Center>
    );
  }

  if (!receipt) {
    return (
      <Center height="100vh">
        <Text color="red.500">Receipt not found</Text>
      </Center>
    );
  }

  return (
    <Center>
      <Box bg={bg} p={8} rounded="md" shadow="md" maxW="md" width="100%">
        <Heading size="lg" mb={4} textAlign="center" color={headingColor}>
          Thank you for your purchase!
        </Heading>
        <Separator mb={4} />
        <Stack gap={2} mb={4} color={textColor}>
          <Text fontWeight="bold" fontSize="lg">
            <Badge bg={badgeBg} color={badgeColor} mr={2}>
              Receipt #:
            </Badge>{' '}
            {receipt.id}
          </Text>
          <Text fontWeight="bold" fontSize="lg">
            <Badge bg={badgeBg} color={badgeColor} mr={2}>
              Order ID:
            </Badge>{' '}
            {receipt.order_id}
          </Text>
        </Stack>
        <Separator my={4} />
        <Heading size="md" mb={2} color={headingColor}>
          Items:
        </Heading>
        <List.Root gap={3}>
          {receipt.items.map((item: any, index: number) => (
            <List.Item key={index} display="flex" alignItems="center" color={textColor}>
              <Image
                src={item.image}
                alt={item.title}
                boxSize="50px"
                objectFit="cover"
                mr={4}
              />
              <Box>
                <Text fontWeight="bold">{item.title}</Text>
                <Text>
                  ${(item.price).toFixed(2)} x {item.quantity}
                </Text>
                <Text>Total: ${(item.price * item.quantity).toFixed(2)}</Text>
              </Box>
            </List.Item>
          ))}
        </List.Root>
        <Separator my={4} />
        <Center>
          <Text fontWeight="bold" fontSize="2xl" color={totalColor}>
            Total Amount: ${(receipt.total_amount).toFixed(2)}
          </Text>
        </Center>
        <Separator my={4} />
        <Center>
          <Button colorPalette="teal" onClick={() => router.push('/')}>
            Back to Store
          </Button>
        </Center>
      </Box>
    </Center>
  );
};

export default PaymentSuccessReceipt;
