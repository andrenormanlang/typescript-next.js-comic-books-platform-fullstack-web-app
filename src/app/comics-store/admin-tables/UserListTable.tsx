"use client";

import {Avatar, 
	Table, Heading,
	Spinner,
	Center,
	Alert,
	Accordion,
	Box,
} from "@chakra-ui/react";
import { useGetUsers } from "@/hooks/fetch-users/useGetUsers";
import { useMemo, useState } from "react";
import SearchBar from "@/components/comics-store/search";
import { SortConfig, User } from "@/types/comics-store/user";

const UserListTable = () => {
	const { data = [], isLoading, isError, error } = useGetUsers();
	const [searchQuery, setSearchQuery] = useState("");
	const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

	const filteredUsers = useMemo(() => {
		return data.filter(
			(user: User) =>
				(user.username?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
				(user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
				(user.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
		);
	}, [data, searchQuery]);

	const sortedAndFilteredUsers = useMemo(() => {
		return [...filteredUsers].sort((a: User, b: User) => {
			if (!sortConfig) return 0;
			const aValue = a[sortConfig.key];
			const bValue = b[sortConfig.key];

			if (!aValue && !bValue) return 0;
			if (!aValue) return 1;
			if (!bValue) return -1;

			if (aValue < bValue) {
				return sortConfig.direction === "ascending" ? -1 : 1;
			}
			if (aValue > bValue) {
				return sortConfig.direction === "ascending" ? 1 : -1;
			}
			return 0;
		});
	}, [filteredUsers, sortConfig]);

	const requestSort = (key: keyof User) => {
		let direction: "ascending" | "descending" = "ascending";
		if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
			direction = "descending";
		}
		setSortConfig({ key, direction });
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";

		const date = new Date(dateString);
		const dateOptions = { day: "2-digit", month: "2-digit", year: "2-digit" } as const;
		const timeOptions = { hour: "2-digit", minute: "2-digit" } as const;
		return `${date.toLocaleDateString("en-GB", dateOptions)} ${date.toLocaleTimeString("en-GB", timeOptions)}`;
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
					<Alert.Description>{error instanceof Error ? error.message : "An error occurred"}</Alert.Description>
				</Alert.Root>
			</Center>
		);
	}

	return (
		<Box maxW="1300px" mx="auto" p={4}>
			<Accordion.Root collapsible>
				<Accordion.Item value="users-list">
					<Accordion.ItemTrigger>
						<Heading as="h1" size="xl" mb={6} flex="1" textAlign="left">
							Users List
						</Heading>
						<Accordion.ItemIndicator />
					</Accordion.ItemTrigger>
					<Accordion.ItemContent pb={4}>
						<SearchBar
							onSearch={setSearchQuery}
							searchQuery={searchQuery}
							totalResults={sortedAndFilteredUsers.length}
						/>

						<Box overflowX="auto">
							<Table.Root variant="outline">
								<Table.Header>
									<Table.Row>
										<Table.ColumnHeader textAlign="center" onClick={() => requestSort("avatar_url")}>
											Avatar
										</Table.ColumnHeader>
										<Table.ColumnHeader textAlign="center" onClick={() => requestSort("created")}>
											Registration Date
										</Table.ColumnHeader>
										<Table.ColumnHeader textAlign="center" onClick={() => requestSort("full_name")}>
											Full Name
										</Table.ColumnHeader>
										<Table.ColumnHeader textAlign="center" onClick={() => requestSort("username")}>
											Username
										</Table.ColumnHeader>
										<Table.ColumnHeader textAlign="center" onClick={() => requestSort("email")}>
											Email
										</Table.ColumnHeader>
										<Table.ColumnHeader textAlign="center" onClick={() => requestSort("last_sign_in")}>
											Last Signed In
										</Table.ColumnHeader>
										<Table.ColumnHeader textAlign="center" onClick={() => requestSort("is_admin")}>
											Admin Status
										</Table.ColumnHeader>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{sortedAndFilteredUsers.map((user: User) => (
										<Table.Row key={user.id}>
											<Table.Cell textAlign="center">
												<Avatar.Root><Avatar.Image src={user.avatar_url || undefined} /><Avatar.Fallback /></Avatar.Root>
											</Table.Cell>
											<Table.Cell textAlign="center">{formatDate(user.created)}</Table.Cell>
											<Table.Cell textAlign="center">{user.full_name || "No Name Provided"}</Table.Cell>
											<Table.Cell textAlign="center">{user.username || "No Username"}</Table.Cell>
											<Table.Cell textAlign="center">{user.email || "No Email"}</Table.Cell>
											<Table.Cell textAlign="center">{formatDate(user.last_sign_in)}</Table.Cell>
											<Table.Cell textAlign="center">{user.is_admin ? "Yes" : "No"}</Table.Cell>
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

export default UserListTable;
