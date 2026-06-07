import { useColorModeValue } from "@/components/ui/color-mode";
import { Box, Image, Text } from "@chakra-ui/react";

import { useRouter } from 'next/navigation';
// Define the shape of a character object


export type Character = {
	id: number;
	name: string;
	image: {
		icon_url: string;
		medium_url: string;
		screen_url: string;
		screen_large_url: string;
		small_url: string;
		super_url: string;
		thumb_url: string;
		tiny_url: string;
		original_url: string;
		image_tags: string;
	  };
  }

  // Define the props for the component
  interface Props {
	character: Character;
  }


  const CharacterCard: React.FC<Props> = ({ character }) => {

	const router = useRouter();

	const navigateToCharacter = () => {
		// Navigate to the character's page using their ID
		router.push(`/search/comic-vine/characters/${character.id}`);
	  };

	return (
	  <Box
	  p={4}
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={useColorModeValue("white", "gray.700")}
      mb={4}
      cursor="pointer"
      onClick={navigateToCharacter}
	  _hover={{
		transform: 'scale(1.05)',
		transition: 'transform 0.2s ease-in-out'
	  }}
	  >
		<Text fontWeight="bold">{character.name}</Text>
		{/* Optionally display character image if available */}
		{character.image && (
		  <Image
			src={character.image.original_url}
			alt={character.name}
			maxW="100%"
			height="auto"
		  />
		)}
	  </Box>
	);
  };

export default CharacterCard;
