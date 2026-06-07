import { useColorModeValue } from "@/components/ui/color-mode";
import React, { ReactNode } from 'react';
import { Flex } from '@chakra-ui/react';

interface Props {
  children: ReactNode; // Typing children explicitly
  // Define hover styles as optional to allow for default props or no props
  hoverBgColor?: string;
  textColor?: string;
  boxHoverShadow?: string;
  [propName: string]: any; // For additional props not explicitly defined
}

// Pass the rest of the props after the explicitly defined ones
const FlexContainer: React.FC<Props> = ({ children, hoverBgColor, textColor, boxHoverShadow, ...props }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Flex
      bg={bgColor}
      p={4}
      borderRadius="md"
      borderWidth="1px"
      borderColor={borderColor}
      _hover={{
        backgroundColor: hoverBgColor,
        boxShadow: boxHoverShadow,
        color: textColor,
      }}
      direction={{ base: "column", md: "row" }}
      align="flex-start"
      justify="space-between"
      {...props} // allows for overriding or adding new props
    >
      {children}
    </Flex>
  );
};

export default FlexContainer;
