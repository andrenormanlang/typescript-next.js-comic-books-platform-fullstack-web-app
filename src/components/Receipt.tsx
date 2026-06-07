"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
// components/auth/ReceiptForm.tsx

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {List, 
  Box,
  Text,
  Spinner,
  Center, Heading,
  Stack,
  Separator,
  Image } from '@chakra-ui/react';

const Receipt = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define color variables for light and dark modes
  const bg = useColorModeValue('gray.50', 'gray.800');
  const textColor = useColorModeValue('black', 'white');
  const headingColor = useColorModeValue('gray.900', 'gray.100');
  const totalColor = useColorModeValue('teal.500', 'teal.200');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('No Order ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/payment-success?orderId=${orderId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setOrder(data.receipt);
        }
      } catch (err) {
        setError('Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

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

  if (!order) {
    return (
      <Center height="100vh">
        <Text color="red.500">Order not found</Text>
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
          <Text fontWeight="bold">Order ID:</Text>
          <Text>{order.order_id}</Text>
        </Stack>
        <Separator my={4} />
        <Heading size="md" mb={2} color={headingColor}>
          Items:
        </Heading>
        <List.Root gap={3}>
          {order.items.map((item: any, index: number) => (
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
                <Text>${(item.price / 100).toFixed(2)} x {item.quantity}</Text>
                <Text>Total: ${(item.price * item.quantity / 100).toFixed(2)}</Text>
              </Box>
            </List.Item>
          ))}
        </List.Root>
        <Separator my={4} />
        <Center>
          <Text fontWeight="bold" fontSize="2xl" color={totalColor}>
            Total Amount: ${(order.total_amount / 100).toFixed(2)}
          </Text>
        </Center>
      </Box>
    </Center>
  );
};

export default Receipt;
