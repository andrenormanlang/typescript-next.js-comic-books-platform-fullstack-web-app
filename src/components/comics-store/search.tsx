"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import { Input, InputGroup, Icon, Box, Text, Center, Flex } from "@chakra-ui/react";
import { Search } from "lucide-react";

interface SearchBarProps {
	onSearch: (query: string) => void;
	searchQuery: string;
	totalResults: number;
	/** Shown to the right of the input (e.g. the store's currency picker). */
	endElement?: React.ReactNode;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, searchQuery, totalResults, endElement }) => {
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onSearch(e.target.value);
	};

	const bgColor = useColorModeValue("white", "gray.700");
	const borderColor = useColorModeValue("gray.300", "gray.600");
	const textColor = useColorModeValue("black", "white");

	return (
		<Center mb={4} width="100%">
			<Box width={{ base: "100%", md: "40%" }} mb={4}>
				<Flex gap={2} alignItems="center">
					<InputGroup flex="1" startElement={<Search size={16} color={borderColor} />}>
						<Input
							type="text"
							placeholder="Search for comics..."
							onChange={handleSearchChange}
							value={searchQuery}
							bg={bgColor}
							borderColor={borderColor}
							color={textColor}
							_hover={{ borderColor: "gray.500" }}
						/>
					</InputGroup>
					{endElement}
				</Flex>
				{searchQuery && (
					<Box mt={2} textAlign="center">
						<Text color={textColor}>
							Found {totalResults} results for &quot;{searchQuery}&quot;
						</Text>
					</Box>
				)}
			</Box>
		</Center>
	);
};

export default SearchBar;
