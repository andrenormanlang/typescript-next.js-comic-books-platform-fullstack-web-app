"use client";

import {Checkbox, Switch,
	Table, Heading,
	Spinner,
	Center,
	Alert, Accordion,
	Box,
	Input,
	Button,
	HStack,
	Flex,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { useGetComics } from "@/hooks/comic-table/useGetComics";
import { Comic } from "@/types/comics-store/comic-detail.type";
import { useState, useEffect, useMemo } from "react";
import { useUpdateComics } from "@/hooks/comic-table/useUpdateComics";
import SearchBar from "@/components/comics-store/search";

type SortConfigKey = keyof Comic | "profiles.username" | "profiles.email";

const ComicsListTable = () => {
	const { data: comics, isLoading, isError, error } = useGetComics();
	const [searchQuery, setSearchQuery] = useState("");
	const [localComics, setLocalComics] = useState<Comic[]>([]);
	const [sortConfig, setSortConfig] = useState<{ key: SortConfigKey; direction: string } | null>(null);
	const [visibleColumns, setVisibleColumns] = useState<string[]>([
		"title",
		"release_date",
		"profiles.username",
		"profiles.email",
		"created_at",
		"updated_at",
		"stock",
		"price",
		"is_approved",
	]);
	const updateStockAndPriceMutation = useUpdateComics();

	useEffect(() => {
		if (comics) {
			setLocalComics(comics);
		}
	}, [comics]);

	const filteredComics = useMemo(() => {
		return localComics.filter((comic) => comic.title.toLowerCase().includes(searchQuery.toLowerCase()));
	}, [localComics, searchQuery]);

	const getNestedValue = (obj: any, path: string) => {
		return path.split(".").reduce((value, key) => value[key], obj);
	};

	const sortedAndFilteredComics = useMemo(() => {
		return filteredComics.sort((a, b) => {
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
	}, [filteredComics, sortConfig]);

	const requestSort = (key: SortConfigKey) => {
		let direction = "ascending";
		if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
			direction = "descending";
		}
		setSortConfig({ key, direction });
	};

	const toggleApproval = async (comic: Comic) => {
		try {
			const response = await fetch("/api/comics-store/toggle-approval", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					comicId: comic.id,
					isApproved: !comic.is_approved,
				}),
			});

			if (!response.ok) throw new Error("Failed to update approval status");

			// Only update local state after successful API call
			const updatedComics = localComics.map((item) =>
				item.id === comic.id ? { ...item, is_approved: !item.is_approved } : item
			);
			setLocalComics(updatedComics);

			const isApproved = !comic.is_approved;
			toaster.create({
				title: isApproved ? "Comic approved." : "Comic disapproved.",
				description: isApproved ? "The comic has been approved." : "The comic has been set to not approved.",
				type: isApproved ? "success" : "warning",
				duration: 5000,
			});
		} catch (error) {
			toaster.create({
				title: "Error updating comic.",
				description: "There was an error updating the approval status.",
				type: "error",
				duration: 5000,
			});
		}
	};

	const handleUpdateStockAndPrice = (comicId: string, newStock: number, newPrice: number) => {
		updateStockAndPriceMutation.mutate(
			{ comicId, newStock, newPrice },
			{
				onSuccess: () => {
					toaster.create({
						title: "Stock and Price updated.",
						description: "The stock and price have been updated successfully.",
						type: "success",
						duration: 5000,
					});
				},
				onError: () => {
					toaster.create({
						title: "Error updating stock and price.",
						description: "There was an error updating the stock and price.",
						type: "error",
						duration: 5000,
					});
				},
			}
		);
	};

	const formatDateRelease = (dateString: string) => {
		const date = new Date(dateString);
		const monthOptions: Intl.DateTimeFormatOptions = { month: "short" };
		const yearOptions: Intl.DateTimeFormatOptions = { year: "numeric" };
		const month = date.toLocaleDateString("en-GB", monthOptions);
		const year = date.toLocaleDateString("en-GB", yearOptions);
		return `${month} / ${year}`;
	};

	const formatDate = (dateString: string) => {
		const dateOptions = { day: "2-digit", month: "2-digit", year: "2-digit" } as const;
		const timeOptions = { hour: "2-digit", minute: "2-digit" } as const;
		const date = new Date(dateString);
		return `${date.toLocaleDateString("en-GB", dateOptions)} ${date.toLocaleTimeString("en-GB", timeOptions)}`;
	};

	const toggleColumnVisibility = (column: string) => {
		setVisibleColumns((prev) => (prev.includes(column) ? prev.filter((col) => col !== column) : [...prev, column]));
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
			<Accordion.Root collapsible>
				<Accordion.Item value="comics-list">
					<Accordion.ItemTrigger>
						<Heading as="h1" size="xl" mb={6} flex="1" textAlign="left">
							Comics List
						</Heading>
						<Accordion.ItemIndicator />
					</Accordion.ItemTrigger>
					<Accordion.ItemContent pb={4}>
						<SearchBar
							onSearch={setSearchQuery}
							searchQuery={searchQuery}
							totalResults={sortedAndFilteredComics.length}
						/>
						<Box overflowX="auto">
							<Table.Root variant="outline">
								<Table.Header>
									<Table.Row>
										<Table.ColumnHeader colSpan={9}>
											<HStack gap={4} flexWrap="wrap">
												{(["title", "release_date", "profiles.username", "profiles.email", "created_at", "updated_at", "stock", "price", "is_approved"] as const).map((col) => {
													const label: Record<string, string> = {
														title: "Title",
														release_date: "Release Date",
														"profiles.username": "User",
														"profiles.email": "Email",
														created_at: "Date / Time Added",
														updated_at: "Date / Time Updated",
														stock: "Stock",
														price: "Price",
														is_approved: "Approve",
													};
													return (
														<Checkbox.Root
															key={col}
															checked={visibleColumns.includes(col)}
															onCheckedChange={() => toggleColumnVisibility(col)}
														>
															<Checkbox.HiddenInput />
															<Checkbox.Control>
																<Checkbox.Indicator />
															</Checkbox.Control>
															<Checkbox.Label>{label[col]}</Checkbox.Label>
														</Checkbox.Root>
													);
												})}
											</HStack>
										</Table.ColumnHeader>
									</Table.Row>
									<Table.Row>
										{visibleColumns.includes("title") && (
											<Table.ColumnHeader textAlign="left" onClick={() => requestSort("title")}>
												Title
											</Table.ColumnHeader>
										)}
										{visibleColumns.includes("release_date") && (
											<Table.ColumnHeader textAlign="center" onClick={() => requestSort("release_date")}>
												Release Date
											</Table.ColumnHeader>
										)}
										{visibleColumns.includes("profiles.username") && (
											<Table.ColumnHeader textAlign="center" onClick={() => requestSort("profiles.username")}>
												User
											</Table.ColumnHeader>
										)}
										{visibleColumns.includes("profiles.email") && (
											<Table.ColumnHeader textAlign="center" onClick={() => requestSort("profiles.email")}>
												Email
											</Table.ColumnHeader>
										)}
										{visibleColumns.includes("created_at") && (
											<Table.ColumnHeader textAlign="center" onClick={() => requestSort("created_at")}>
												Date / Time Added
											</Table.ColumnHeader>
										)}
										{visibleColumns.includes("updated_at") && (
											<Table.ColumnHeader textAlign="center" onClick={() => requestSort("updated_at")}>
												Date / Time Updated
											</Table.ColumnHeader>
										)}
										{visibleColumns.includes("stock") && <Table.ColumnHeader textAlign="center">Stock</Table.ColumnHeader>}
										{visibleColumns.includes("price") && <Table.ColumnHeader textAlign="center">Price</Table.ColumnHeader>}
										{visibleColumns.includes("is_approved") && <Table.ColumnHeader textAlign="center">Approve</Table.ColumnHeader>}
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{sortedAndFilteredComics.map((comic: Comic) => (
										<Table.Row key={comic.id}>
											{visibleColumns.includes("title") && (
												<Table.Cell textAlign="initial">{comic.title}</Table.Cell>
											)}
											{visibleColumns.includes("release_date") && (
												<Table.Cell textAlign="center">{formatDateRelease(comic.release_date)}</Table.Cell>
											)}
											{visibleColumns.includes("profiles.username") && (
												<Table.Cell textAlign="center">{comic.profiles?.username || "Unknown"}</Table.Cell>
											)}
											{visibleColumns.includes("profiles.email") && (
												<Table.Cell textAlign="center">{comic.profiles?.email || "Unknown"}</Table.Cell>
											)}
											{visibleColumns.includes("created_at") && (
												<Table.Cell textAlign="center">{formatDate(comic.created_at)}</Table.Cell>
											)}
											{visibleColumns.includes("updated_at") && (
												<Table.Cell textAlign="center">{formatDate(comic.updated_at)}</Table.Cell>
											)}
											{visibleColumns.includes("stock") && (
												<Table.Cell textAlign="center">
													<HStack>
														<Input
															size="sm"
															value={comic.stock}
															onChange={(e) =>
																setLocalComics(
																	localComics.map((item) =>
																		item.id === comic.id
																			? {
																					...item,
																					stock: parseInt(e.target.value, 10),
																			  }
																			: item
																	)
																)
															}
															width="60px"
															textAlign="center"
														/>
														<Button
															size="sm"
															onClick={() =>
																handleUpdateStockAndPrice(
																	comic.id,
																	localComics.find((item) => item.id === comic.id)
																		?.stock || comic.stock,
																	comic.price
																)
															}
														>
															Update
														</Button>
													</HStack>
												</Table.Cell>
											)}
											{visibleColumns.includes("price") && (
												<Table.Cell textAlign="center">
													<HStack>
														<Input
															size="sm"
															value={comic.price}
															onChange={(e) =>
																setLocalComics(
																	localComics.map((item) =>
																		item.id === comic.id
																			? {
																					...item,
																					price: parseFloat(e.target.value),
																			  }
																			: item
																	)
																)
															}
															width="60px"
															textAlign="center"
														/>
														<Button
															size="sm"
															onClick={() =>
																handleUpdateStockAndPrice(
																	comic.id,
																	comic.stock,
																	localComics.find((item) => item.id === comic.id)
																		?.price || comic.price
																)
															}
														>
															Update
														</Button>
													</HStack>
												</Table.Cell>
											)}
											{visibleColumns.includes("is_approved") && (
												<Table.Cell textAlign="center">
													<Switch.Root
														checked={comic.is_approved}
														onCheckedChange={() => toggleApproval(comic)}
													>
														<Switch.HiddenInput />
														<Switch.Control>
															<Switch.Thumb />
														</Switch.Control>
													</Switch.Root>
												</Table.Cell>
											)}
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

export default ComicsListTable;
