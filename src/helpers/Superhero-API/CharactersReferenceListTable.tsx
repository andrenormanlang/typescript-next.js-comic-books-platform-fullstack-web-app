"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import { useRouter } from "next/navigation";
import { useBreakpointValue, Table, Flex } from "@chakra-ui/react";
import { useEffect, useState } from "react";

export type Character = {
	ID: number;
	CharacterName: string;
};

export type CharactersApiResponse = {
	data: Character[];
	status: string;
};

const CharactersReferenceListTable: React.FC<{ characters: CharactersApiResponse }> = ({ characters }) => {
	const router = useRouter();
	const bg = useColorModeValue("red.100", "red.700");
	const columns = useBreakpointValue({ base: 1, md: 2, lg: 3 });

	const [characterColumns, setCharacterColumns] = useState<Character[][]>([]);

	const handleRowClick = (characterId: number) => {
		router.push(`/search/superheros/superhero-api/${characterId}`);
	};

	useEffect(() => {
		const charactersAny = characters as any;
		if (Array.isArray(charactersAny.data.data)) {
			const columnSize = Math.ceil(charactersAny.data.data.length / (columns || 1));
			const newCharacterColumns = new Array(columns).fill(null).map((_, index) => {
				return charactersAny.data.data.slice(index * columnSize, (index + 1) * columnSize);
			});
			setCharacterColumns(newCharacterColumns);
		} else {
			console.log('Data is not an array:', characters.data);
		}
	}, [characters, columns]);

	return (
		<Flex direction="row" overflowX="auto" h="80vh">
			{characterColumns.map((column, columnIndex) => (
				<Table.Root key={columnIndex} variant="outline" size="sm" mx={4}>
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeader>ID</Table.ColumnHeader>
							<Table.ColumnHeader>Character Name</Table.ColumnHeader>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{column.map((character) => (
							<Table.Row
								key={character.ID}
								_hover={{ bg: bg, cursor: "pointer" }}
								onClick={() => handleRowClick(character.ID)}
							>
								<Table.Cell>{character.ID}</Table.Cell>
								<Table.Cell>{character.CharacterName}</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Root>
			))}
		</Flex>
	);
};

export default CharactersReferenceListTable;
