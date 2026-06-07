'use client';

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { createClient } from "@/utils/supabase/client";
import { type User } from "@supabase/supabase-js";
import Avatar from "./avatar";
import {Box, Button, Field, Input, VStack, Heading, Spinner, Alert, Center, Text } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { RootState } from '@/store/store';
import { setAvatarUrl } from '@/store/avatarSlice';
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Define validation schema
const validationSchema = z.object({
  fullname: z.string()
    .min(1, { message: 'Full name is required' })
    .refine(name => {
      const names = name.trim().split(" ");
      return names.length >= 2 && names.every(n => n.length >= 2);
    }, { message: 'Full name must be at least two names with 2 characters each' }),
  username: z.string().min(1, { message: 'Username is required' }),
  avatarUrl: z.string().url({ message: '' }).optional(),
});

type FormData = z.infer<typeof validationSchema>;

export default function AccountForm({ user }: { user: User | null }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const avatarUrl = useSelector((state: RootState) => state.avatar.url);
  const router = useRouter();
  const dispatch = useDispatch();
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      fullname: '',
      username: '',
      avatarUrl: '',
    }
  });

  const getProfile = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error, status } = await supabase
        .from("profiles")
        .select(`full_name, username, avatar_url`)
        .eq("id", user?.id)
        .single();

      if (error && status !== 406) {
        console.log(error);
        throw error;
      }

      if (data) {
        setValue("fullname", data.full_name || '');
        setValue("username", data.username || '');
        setValue("avatarUrl", data.avatar_url || '');
        dispatch(setAvatarUrl(data.avatar_url));
      }
    } catch (error) {
      setError("Error loading user data!");
    } finally {
      setLoading(false);
    }
  }, [user, supabase, dispatch, setValue]);

  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user, getProfile]);

  const updateProfile: SubmitHandler<FormData> = async ({ fullname, username, avatarUrl }) => {
	try {
	  setLoading(true);
	  setError(null);

	  // Check if the username already exists for a different user
	  const { data: existingUser, error: usernameError } = await supabase
		.from('profiles')
		.select('id')
		.eq('username', username)
		.neq('id', user?.id)
		.single();

	  if (usernameError && usernameError.code !== 'PGRST116') { // PGRST116 is the code for no results found
		throw usernameError;
	  }

	  if (existingUser) {
		throw new Error('Username already exists. Please choose another one.');
	  }

	  const { error } = await supabase.from("profiles").upsert({
		id: user?.id as string,
		full_name: fullname,
		username,
		avatar_url: avatarUrl,
		updated_at: new Date().toISOString(),
	  });

	  if (error) throw error;

	  toaster.create({
		title: "Profile updated.",
		description: "Your profile has been updated successfully.",
		type: "success",
		duration: 5000,
	  });
	} catch (error: any) {
	  setError("Error updating the data!");
	  toaster.create({
		title: "Profile update failed.",
		description: error.message || "There was an error updating your profile.",
		type: "error",
		duration: 5000,
	  });
	} finally {
	  setLoading(false);
	}
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      setError("Error signing out!");
      toaster.create({
        title: "Sign out failed.",
        description: "There was an error signing out.",
        type: "error",
        duration: 5000,
      });
    }
  };


  return (
    <Center>
      <Box
        p={8}
        maxWidth={{ base: "90%", md: "400px" }}
        width="full"
        boxShadow="md"
        borderRadius="md"
      >
        <Heading as="h1" size="lg" mb={6} textAlign="center">
          Account
        </Heading>
        {error && (
          <Alert.Root status="error" mb={4}>
            <Alert.Indicator />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        )}
        {loading ? (
          <Center height="100%">
            <Spinner />
          </Center>
        ) : (
          <VStack gap={4} as="form" onSubmit={handleSubmit(updateProfile)}>
            <Field.Root id="email">
              <Field.Label>Email</Field.Label>
              <Input type="text" value={user?.email || ''} disabled />
            </Field.Root>
            {user && (
              <Avatar
                uid={user.id}
                url={avatarUrl}
                size={150}
                onUpload={(url) => {
                  dispatch(setAvatarUrl(url));
                  setValue("avatarUrl", url);
                }}
              />
            )}
            <Field.Root id="fullname" invalid={!!errors.fullname}>
              <Field.Label>Full Name</Field.Label>
              <Input
                type="text"
                {...register("fullname")}
              />
              {errors.fullname && <Text color="red.500">{errors.fullname.message}</Text>}
            </Field.Root>
            <Field.Root id="username" invalid={!!errors.username}>
              <Field.Label>Username</Field.Label>
              <Input
                type="text"
                {...register("username")}
              />
              {errors.username && <Text color="red.500">{errors.username.message}</Text>}
            </Field.Root>
            {errors.avatarUrl && <Text color="red.500">{errors.avatarUrl.message}</Text>}
            <Button
              colorPalette="teal"
              width="300px"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Loading ...' : 'Update'}
            </Button>
            <Button
              colorPalette="red"
              width="300px"
              mt={4}
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </VStack>
        )}
      </Box>
    </Center>
  );
}







// WITH CONTEXT!
// 'use client';
// // components/AccountForm.tsx
// import { useCallback, useEffect, useState } from "react";
// import { createClient } from "@/utils/supabase/client";
// import { type User } from "@supabase/supabase-js";
// import Avatar from "./avatar";
// import { Box, Button, Input, VStack, Heading, Spinner, Alert, Center } from "@chakra-ui/react";
// import { useAvatar } from "@/contexts/AvatarContext";

// export default function AccountForm({ user }: { user: User | null }) {
//   const supabase = createClient();
//   const [loading, setLoading] = useState(true);
//   const [fullname, setFullname] = useState<string | null>(null);
//   const [username, setUsername] = useState<string | null>(null);
//   const [website, setWebsite] = useState<string | null>(null);
//   const { avatarUrl, setAvatarUrl } = useAvatar();
//   const [is_admin, setIsAdmin] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);

//   const getProfile = useCallback(async () => {
//     try {
//       setLoading(true);

//       const { data, error, status } = await supabase
//         .from("profiles")
//         .select(`full_name, username, website, avatar_url, is_admin`)
//         .eq("id", user?.id)
//         .single();

//       if (error && status !== 406) {
//         console.log(error);
//         throw error;
//       }

//       if (data) {
//         setFullname(data.full_name);
//         setUsername(data.username);
//         setWebsite(data.website);
//         setAvatarUrl(data.avatar_url);
//         setIsAdmin(data.is_admin);
//       }
//     } catch (error) {
//       setError("Error loading user data!");
//     } finally {
//       setLoading(false);
//     }
//   }, [user, setAvatarUrl, supabase]);

//   useEffect(() => {
//     getProfile();
//   }, [user, getProfile]);

//   async function updateProfile({
//     fullname,
//     username,
//     website,
//     avatarUrl,
//   }: {
//     fullname: string | null;
//     username: string | null;
//     website: string | null;
//     avatarUrl: string | null;
//   }) {
//     try {
//       setLoading(true);
//       setError(null);

//       const { error } = await supabase.from("profiles").upsert({
//         id: user?.id as string,
//         full_name: fullname,
//         username,
//         website,
//         avatar_url: avatarUrl,
//         updated_at: new Date().toISOString(),
//       });
//       if (error) throw error;
//       alert("Profile updated!");
//     } catch (error) {
//       setError("Error updating the data!");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <Center minH="100vh" bg={useColorModeValue("gray.50", "gray.800")}>
//       <Box
//         p={8}
//         maxWidth="400px"
//         width="full"
//         bg={useColorModeValue("white", "gray.700")}
//         boxShadow="md"
//         borderRadius="md"
//       >
//         <Heading as="h1" size="lg" mb={6} textAlign="center">
//           Account
//         </Heading>
//         {error && (
//           <Alert status="error" mb={4}>
//             <Alert.Indicator />
//             {error}
//           </Alert>
//         )}
//         {loading ? (
//           <Spinner />
//         ) : (
//           <VStack gap={4}>
//             <Field.Root id="email">
//               <Field.Label>Email</Field.Label>
//               <Input type="text" value={user?.email} isDisabled />
//             </Field.Root>
//             <Avatar.Root
//               uid={user?.id ?? null}
//               url={avatarUrl}
//               size={150}
//               onUpload={(url) => {
//                 setAvatarUrl(url);
//                 updateProfile({ fullname, username, website, avatarUrl: url });
//               }}
//             />
//             <Field.Root id="fullName">
//               <Field.Label>Full Name</Field.Label>
//               <Input
//                 type="text"
//                 value={fullname || ''}
//                 onChange={(e) => setFullname(e.target.value)}
//               />
//             </Field.Root>
//             <Field.Root id="username">
//               <Field.Label>Username</Field.Label>
//               <Input
//                 type="text"
//                 value={username || ''}
//                 onChange={(e) => setUsername(e.target.value)}
//               />
//             </Field.Root>
//             <Field.Root id="website">
//               <Field.Label>Website</Field.Label>
//               <Input
//                 type="url"
//                 value={website || ''}
//                 onChange={(e) => setWebsite(e.target.value)}
//               />
//             </Field.Root>
//             <Field.Root id="isAdmin">
//               <Field.Label>Admin Status</Field.Label>
//               <Input
//                 type="text"
//                 value={is_admin ? 'Admin' : 'User'}
//                 isDisabled
//               />
//             </Field.Root>
//             <Button
//               colorPalette="teal"
//               width="full"
//               onClick={() => updateProfile({ fullname, username, website, avatarUrl })}
//               disabled={loading}
//             >
//               {loading ? 'Loading ...' : 'Update'}
//             </Button>
//             <form action="/auth/signout" method="post">
//               <Button colorPalette="red" width="full" type="submit">
//                 Sign out
//               </Button>
//             </form>
//           </VStack>
//         )}
//       </Box>
//     </Center>
//   );
// }

