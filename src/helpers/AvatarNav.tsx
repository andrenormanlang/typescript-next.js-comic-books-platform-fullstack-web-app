"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
// In your AvatarNav component
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Image, Box, Spinner, Text, useBreakpointValue } from "@chakra-ui/react";
import { setAvatarUrl } from "@/store/avatarSlice";
import { useGetAvatar } from "@/hooks/avatar-image/useGetAvatar";

interface AvatarNavProps {
  uid: string | null;
  size: { base: number; md: number };
}

export default function AvatarNav({ uid, size }: AvatarNavProps) {
  // Only call the hook if uid is non-null and valid.
  const { data: avatarUrl, isLoading, isError } = useGetAvatar(uid ?? "");
  const dispatch = useDispatch();
  const borderColor = useColorModeValue("gray.300", "gray.600");
  const responsiveSize = useBreakpointValue(size);

  useEffect(() => {
    if (avatarUrl) {
      dispatch(setAvatarUrl(avatarUrl));
    }
  }, [avatarUrl, dispatch]);

  if (isLoading) {
    return <Spinner />;
  }
  if (isError) {
    return <Text color="red.500">Error loading avatar</Text>;
  }

  return (
    <Box textAlign="center" borderRadius="full" borderWidth={1} borderColor={borderColor}>
      {avatarUrl ? (
        <Image
          width={responsiveSize}
          height={responsiveSize}
          src={avatarUrl}
          alt="Avatar"
          style={{ objectFit: "cover", borderRadius: "50%" }}
        />
      ) : (
        <Box
          height={responsiveSize}
          width={responsiveSize}
          borderRadius="50%"
          bg="gray.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize="11px" color="red.500">No Image</Text>
        </Box>
      )}
    </Box>
  );
}


// WITh CONTEXT!
// components/AvatarNav.tsx
// import { useEffect, useState } from 'react'
// import { createClient } from '@/utils/supabase/client'
// import { Image, Box, Spinner } from "@chakra-ui/react";
// import { useAvatar } from '@/contexts/AvatarContext';

// export default function AvatarNav({
//   uid,
//   size,
// }: {
//   uid: string | null
//   size: number
// }) {
//   const supabase = createClient()
//   const { avatarUrl, setAvatarUrl } = useAvatar();
//   const [loading, setLoading] = useState(false)

//   useEffect(() => {
//     async function downloadImage(path: string) {
//       try {
//         setLoading(true)
//         const { data, error } = await supabase.storage.from('avatars').download(path)
//         if (error) {
//           throw error
//         }

//         const url = URL.createObjectURL(data)
//         setAvatarUrl(url)
//       } catch (error) {
//         console.log('Error downloading image: ', error)
//       } finally {
//         setLoading(false)
//       }
//     }

//     if (avatarUrl) downloadImage(avatarUrl)
//   }, [avatarUrl, supabase, setAvatarUrl])

//   return (
//     <Box textAlign="center">
//       {avatarUrl ? (
//         <Image
//           width={size}
//           height={size}
//           src={avatarUrl}
//           alt="Avatar"
//           style={{ height: size, width: size, borderRadius: '30%' }}
//         />
//       ) : (
//         <Box
//           height={size}
//           width={size}
//           borderRadius="30%"
//           bg="gray.200"
//           display="flex"
//           alignItems="center"
//           justifyContent="center"
//         >
//           {loading ? <Spinner /> : 'No image'}
//         </Box>
//       )}
//     </Box>
//   )
// }


