import { useColorModeValue } from "@/components/ui/color-mode";
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { createClient } from '@supabase/supabase-js';
import { Image, Box, Button, Spinner } from "@chakra-ui/react";
import { setAvatarUrl as setAvatarUrlRedux } from '@/store/avatarSlice';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface AvatarProps {
  uid: string;
  url: string | null;
  size: number;
  onUpload: (url: string) => void;
}

const Avatar: React.FC<AvatarProps> = ({ uid, url, size, onUpload }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(url);
  const [uploading, setUploading] = useState(false);
  const dispatch = useDispatch();

  const fetchImage = async (path: string) => {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);



    if (data) {
      setAvatarUrl(data.publicUrl);
      dispatch(setAvatarUrlRedux(data.publicUrl));
    }
  };

//   useEffect(() => {
//     if (url) fetchImage(url);
//   }, [url]);

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${uid}-${Math.random()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);



      const publicUrl = publicUrlData.publicUrl;
      console.log('Public URL:', publicUrl);

      setAvatarUrl(publicUrl);
      onUpload(publicUrl);
      dispatch(setAvatarUrlRedux(publicUrl));
    } catch (error) {
      alert('Error uploading avatar!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box textAlign="center" mb={4}>
      {avatarUrl ? (
        <Image
          width={size}
          height={size}
          src={avatarUrl}
          alt="Upload an Image"
		  style={{
			borderRadius: '20%', // this will make it round
			objectFit: 'cover', // prevents distortion
			border: '2px solid white', // optional: adds a border around the image
			boxSizing: 'border-box'
		  }}
        />
      ) : (
        <Box
          height={size}
          width={size}
          borderRadius="20%"
          bg="gray.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {uploading ? <Spinner /> : ''}
        </Box>
      )}
      <Box mt={4}>
        <Button asChild
          colorPalette="teal"
        ><label htmlFor="single">
          Upload
        </label></Button>
        <input
          style={{
            visibility: 'hidden',
            position: 'absolute',
          }}
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </Box>
    </Box>
  );
};

export default Avatar;



// CONTEXT!
// components/Avatar.tsx
// import React, { useEffect, useState } from 'react'
// import { createClient } from '@/utils/supabase/client'
// import { Image, Box, Button, Spinner } from "@chakra-ui/react";

// export default function Avatar({
//   uid,
//   url,
//   size,
//   onUpload,
// }: {
//   uid: string | null
//   url: string | null
//   size: number
//   onUpload: (url: string) => void
// }) {
//   const supabase = createClient()
//   const [avatarUrl, setAvatarUrl] = useState<string | null>(url)
//   const [uploading, setUploading] = useState(false)

//   useEffect(() => {
//     async function downloadImage(path: string) {
//       try {
//         const { data, error } = await supabase.storage.from('avatars').download(path)
//         if (error) {
//           throw error
//         }

//         const url = URL.createObjectURL(data)
//         setAvatarUrl(url)
//       } catch (error) {
//         console.log('Error downloading image: ', error)
//       }
//     }

//     if (url) downloadImage(url)
//   }, [url, supabase])

//   const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
//     try {
//       setUploading(true)

//       if (!event.target.files || event.target.files.length === 0) {
//         throw new Error('You must select an image to upload.')
//       }

//       const file = event.target.files[0]
//       const fileExt = file.name.split('.').pop()
//       const filePath = `${uid}-${Math.random()}.${fileExt}`

//       const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

//       if (uploadError) {
//         throw uploadError
//       }

//       const { data: publicURLData } = await supabase
//         .storage
//         .from('avatars')
//         .getPublicUrl(filePath)


//       const publicUrl = publicURLData.publicUrl

//       setAvatarUrl(publicUrl)
//       onUpload(publicUrl)
//     } catch (error) {
//       alert('Error uploading avatar!')
//     } finally {
//       setUploading(false)
//     }
//   }

//   return (
//     <Box textAlign="center" mb={4}>
//       {avatarUrl ? (
//         <Image
//           width={size}
//           height={size}
//           src={avatarUrl}
//           alt="Avatar"
//           style={{ height: size, width: size, borderRadius: '50%' }}
//         />
//       ) : (
//         <Box
//           height={size}
//           width={size}
//           borderRadius="50%"
//           bg="gray.200"
//           display="flex"
//           alignItems="center"
//           justifyContent="center"
//         >
//           {uploading ? <Spinner /> : 'No image'}
//         </Box>
//       )}
//       <Box mt={4}>
//         <Button
//           as="label"
//           htmlFor="single"
//           colorPalette="teal"
//           loading={uploading}
//           loadingText="Uploading"
//         >
//           Upload
//         </Button>
//         <input
//           style={{
//             visibility: 'hidden',
//             position: 'absolute',
//           }}
//           type="file"
//           id="single"
//           accept="image/*"
//           onChange={uploadAvatar}
//           disabled={uploading}
//         />
//       </Box>
//     </Box>
//   )
// }
