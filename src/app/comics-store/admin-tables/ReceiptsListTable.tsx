'use client';

import SearchBar from "@/components/comics-store/search";
import { useGetReceipts } from "@/hooks/comic-table/useGetReceipts";
import {
  Table, Heading,
  Spinner,
  Center,
  Alert,
  Accordion,
  Box,
} from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";

type Receipt = {
  id: string;
  user_id: string;
  order_id: number;
  total_amount: number;
  currency: string;
  items: Array<{ title: string; price: number; quantity: number }>;
  created_at: string;
  profiles: { id: string; username: string; email: string };
};

const ReceiptsListTable = () => {
  const { data: receipts, isLoading, isError, error } = useGetReceipts();
  const [searchQuery, setSearchQuery] = useState("");
  const [localReceipts, setLocalReceipts] = useState<Receipt[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: string } | null>(null);

  useEffect(() => {
    if (receipts) {
      setLocalReceipts(receipts);
    }
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
	return localReceipts.filter(receipt =>
	  receipt.id.toString().includes(searchQuery) ||
	  receipt.profiles.username.toLowerCase().includes(searchQuery.toLowerCase())
	);
  }, [localReceipts, searchQuery]);


  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((value, key) => value[key], obj);
  };

  const formatDate = (dateString: string) => {
    const dateOptions = { day: "2-digit", month: "2-digit", year: "2-digit" } as const;
    const timeOptions = { hour: "2-digit", minute: "2-digit" } as const;
    const date = new Date(dateString);
    return `${date.toLocaleDateString("en-GB", dateOptions)} ${date.toLocaleTimeString("en-GB", timeOptions)}`;
  };

  const sortedAndFilteredReceipts = useMemo(() => {
	return filteredReceipts.sort((a, b) => {
	  if (!sortConfig) return 0;
	  const aValue = getNestedValue(a, sortConfig.key);
	  const bValue = getNestedValue(b, sortConfig.key);

	  if (aValue < bValue) {
		return sortConfig.direction === "ascending" ? -1 : 1;
	  }
	  if (aValue > bValue) {
		return sortConfig.direction === "ascending" ? 1 : -1;
	  }
	  return 0;
	});
  }, [filteredReceipts, sortConfig]);


  const requestSort = (key: string) => {
    let direction = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h="100vh">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Description>{error.message}</Alert.Description>
        </Alert.Root>
      </Center>
    );
  }

  return (
    <Box maxW="1300px" mx="auto" p={4}>
      <Accordion.Root >
        <Accordion.Item value="receipts-list">
          <Accordion.ItemTrigger>
            <Heading as="h1" size="xl" mb={6} flex="1" textAlign="left">
              Receipts List
            </Heading>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent pb={4}>
		  <SearchBar onSearch={setSearchQuery} searchQuery={searchQuery} totalResults={sortedAndFilteredReceipts.length} />

            <Box overflowX="auto">
              <Table.Root variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader onClick={() => requestSort("id")} textAlign="center">Receipt ID</Table.ColumnHeader>
                    <Table.ColumnHeader onClick={() => requestSort("order_id")} textAlign="center">Order ID</Table.ColumnHeader>
                    <Table.ColumnHeader onClick={() => requestSort("created_at")} textAlign="center">Date of Receipt</Table.ColumnHeader>
                    <Table.ColumnHeader onClick={() => requestSort("profiles.username")} textAlign="center">User</Table.ColumnHeader>
                    <Table.ColumnHeader onClick={() => requestSort("profiles.email")} textAlign="center">Email</Table.ColumnHeader>
                    <Table.ColumnHeader onClick={() => requestSort("total_amount")} textAlign="center">Total Amount</Table.ColumnHeader>
                    <Table.ColumnHeader onClick={() => requestSort("currency")} textAlign="center">Currency</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sortedAndFilteredReceipts.map((receipt: Receipt) => (
                    <Table.Row key={receipt.id}>
                      <Table.Cell textAlign="center">{receipt.id}</Table.Cell>
                      <Table.Cell textAlign="center">{receipt.order_id}</Table.Cell>
                      <Table.Cell textAlign="center">{formatDate(receipt.created_at)}</Table.Cell>
                      <Table.Cell textAlign="center">{receipt.profiles?.username || "Unknown"}</Table.Cell>
                      <Table.Cell textAlign="center">{receipt.profiles?.email || "Unknown"}</Table.Cell>
                      <Table.Cell textAlign="center">{receipt.total_amount}</Table.Cell>
                      <Table.Cell textAlign="center">{receipt.currency}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>
    </Box>
  );
};

export default ReceiptsListTable;
