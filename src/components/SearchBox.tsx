"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import { Input, Button, Stack, Flex, Box, IconButton } from "@chakra-ui/react";
import { X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type SearchComponentProps = {
	onSearch: (term: string) => void;
	/** Optional override for the clear behavior */
	onClearQuery?: () => void;
	/** Show/hide the clear query button (default: true) */
	showClearQuery?: boolean;

	/** @deprecated Use onClearQuery */
	onRefresh?: () => void;
	/** @deprecated Use showClearQuery */
	showRefresh?: boolean;
};

const SearchBox: React.FC<SearchComponentProps> = ({
	onSearch,
	onClearQuery,
	showClearQuery,
	onRefresh,
	showRefresh,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [activeQuery, setActiveQuery] = useState("");
	const bgColor = useColorModeValue("white", "gray.700");
	const borderColor = useColorModeValue("gray.300", "gray.600");

	const shouldShowClear = showClearQuery ?? showRefresh ?? true;

	useEffect(() => {
		if (typeof window === "undefined") return;
		const q = new URLSearchParams(window.location.search).get("query") || "";
		setActiveQuery(q);
		setSearchTerm(q);
	}, []);

	const handleSearch = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		onSearch(searchTerm);
		if (typeof window !== "undefined") {
			const searchParams = new URLSearchParams(window.location.search);
			if (searchTerm) {
				searchParams.set("query", searchTerm);
			} else {
				searchParams.delete("query");
			}
			window.history.pushState(null, "", "?" + searchParams.toString());
			setActiveQuery(searchTerm);
		}
	};

	const handleClear = () => {
		const clearOverride = onClearQuery ?? onRefresh;
		if (clearOverride) {
			clearOverride();
			return;
		}

		setSearchTerm("");
		setActiveQuery("");
		onSearch("");
		if (typeof window !== "undefined") {
			const searchParams = new URLSearchParams(window.location.search);
			searchParams.delete("query");
			window.history.pushState(null, "", "?" + searchParams.toString());
		}
	};

	return (
		<Flex justify="center" width="100%" mb={8}>
			<Box width={{ base: "90%", sm: "80%", md: "60%", lg: "40%" }}>
				<form onSubmit={handleSearch} style={{ width: "100%" }}>
					<Stack direction="row" gap={4} width="100%" align="center">
						<Input
							type="text"
							placeholder="Search..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							bg={bgColor}
							borderColor={borderColor}
							_hover={{ borderColor: "blue.500" }}
							_focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
						/>
						{shouldShowClear && !!activeQuery && (
							<IconButton
								aria-label="Clear query"
								onClick={handleClear}
								variant="outline"
								colorPalette="blue"
							>
								<X />
							</IconButton>
						)}
						<Button type="submit" colorPalette="blue" minW="100px">
							Search
						</Button>
					</Stack>
				</form>
			</Box>
		</Flex>
	);
};

export default SearchBox;
