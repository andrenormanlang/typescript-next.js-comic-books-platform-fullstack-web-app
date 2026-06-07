import { useColorModeValue } from "@/components/ui/color-mode";
// app/auth/confirm/page.tsx

import React, { Suspense } from "react";
import ConfirmForm from "@/components/auth/ConfirmServer";
import { Spinner, Center } from "@chakra-ui/react";

export default function ConfirmPage() {
  return (
    <Suspense
    >
      <ConfirmForm />
    </Suspense>
  );
}



// "use client";

// import React from "react";
// import { useSearchParams } from "next/navigation";
// import {
//   Box,
//   Center,
//   Text,
//, //   Heading,
//   VStack,
//   Separator,
// } from "@chakra-ui/react";

// export default function Confirm() {
//   const searchParams = useSearchParams();
//   const message = searchParams.get("message");

//   // Extract the email part from the message if it follows the format you expect
//   const emailRegex = /Check email\((.+?)\)/;
//   const emailMatch = message?.match(emailRegex);
//   const email = emailMatch ? emailMatch[1] : "";

//   return (
//     <Center >
//       <Box
//         p={8}
//         maxWidth="400px"
//         width="full"
//         boxShadow="lg"
//         borderRadius="lg"
//       >
//         <VStack gap={4}>
//           <Heading as="h1" size="lg" color="green.600" textAlign="center">
//             Confirmation Required
//           </Heading>
//           <Separator />
//           <Text textAlign="center" fontSize="md" color="green.600">
//             Check your email <span style={{ fontWeight: 'bold' }}>{email}</span> to continue the sign-in process
//           </Text>
//           <Text textAlign="center" fontSize="sm" color="red.500">
//             Please check your email for further instructions.
//           </Text>
//         </VStack>
//       </Box>
//     </Center>
//   );
// }

