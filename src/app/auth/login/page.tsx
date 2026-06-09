import { useColorModeValue } from "@/components/ui/color-mode";
import React from "react";
import LoginServer from "@/components/auth/LoginServer";

type SearchParams = {
  [key: string]: string | string[];
};

interface PageProps {
  searchParams?: Promise<SearchParams>;
}

export default async function Login({ searchParams }: PageProps) {
  const params = await searchParams;
  let message: string | undefined;

  if (params) {
    const msg = params.message;
    if (Array.isArray(msg)) {
      message = msg[0];
    } else {
      message = msg;
    }
  }

  return <LoginServer message={message} />;
}



// 'use client';

// import React, { useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import {InputElement, Field, 
//   Box,
//   Heading,
//, //, //   Input,
//   Button,
//   Text,
//   Center,
//   Spinner,
//   useToast,
//   InputGroup,
//, //   IconButton,
//, // } from "@chakra-ui/react";
// import Link from "next/link";
// import { createClient } from "@/utils/supabase/client";
// import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
// import { z, ZodError } from "zod";
// import { useDispatch } from 'react-redux';
// import { setAccessToken } from '@/store/authSlice';  // Make sure this path is correct

// // Define a Zod schema for password validation directly
// const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

// const validationSchema = z.object({
//   email: z.string().email("Must be a valid email"),
//   password: passwordSchema,
// });

// export default function Login() {
//   const dispatch = useDispatch();
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const message = searchParams.get("message");

//   const supabase = createClient();

//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const toast = useToast();
//   const [showPassword, setShowPassword] = useState(false);
//   const [formData, setFormData] = useState({ email: "", password: "" });

//   const bgCenter = useColorModeValue("gray.50", "gray.800");
//   const bgBox = useColorModeValue("white", "gray.700");

//   useEffect(() => {
//     const checkUser = async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user) {
//         setIsAuthenticated(true);
//         router.push("/");
//       } else {
//         setLoading(false);
//       }
//     };
//     checkUser();

//     const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
//       if (event === "SIGNED_IN") {
//         setIsAuthenticated(true);
//         router.refresh();
//       }
//     });

//     return () => {
//       authListener.subscription.unsubscribe();
//     };
//   }, [router, supabase.auth]);

//   const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     const { email, password } = formData;

//     try {
//       validationSchema.parse({ email, password });
//     } catch (err) {
//       if (err instanceof ZodError) {
//         err.errors.forEach((error) => {
//           toast({
//             title: "Validation Error",
//             description: error.message,
//             status: "error",
//             duration: 9000,
//             isClosable: true,
//           });
//         });
//         return;
//       }
//     }

//     const { data, error } = await supabase.auth.signInWithPassword({ email, password });

//     if (error) {
//       toast({
//         title: "Authentication Failed",
//         description: error.message,
//         status: "error",
//         duration: 9000,
//         isClosable: true,
//         position: "top",
//       });
//       router.push("/auth/login?message=Could not authenticate user");
//     } else {
//       dispatch(setAccessToken(data.session.access_token));
//       setIsAuthenticated(true);
//       router.refresh();
//       toast({
//         title: "Logged In Successfully",
//         description: "You have successfully logged in.",
//         status: "success",
//         duration: 5000,
//         isClosable: true,
//         position: "top",
//       });
//       router.push("/");
//     }
//   };

//   if (loading) {
//     return (
//       <Center minH="100vh">
//         <Spinner size="xl" />
//       </Center>
//     );
//   }

//   if (isAuthenticated) {
//     window.location.reload();
//     return null;
//   }

//   return (
//     <Center>
//       <Box
//         p={8}
//         maxWidth="400px"
//         width="full"
//         boxShadow="md"
//         borderRadius="md"
//       >
//         <Heading as="h1" size="lg" mb={6} textAlign="center">
//           Sign In
//         </Heading>
//         <form onSubmit={signIn}>
//           <Field.Root id="email" mb={4}>
//             <Field.Label>Email</Field.Label>
//             <Input
//               type="email"
//               name="email"
//               required
//               value={formData.email}
//               onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//             />
//           </Field.Root>
//           <Field.Root id="password" mb={4}>
//             <Field.Label>Password</Field.Label>
//             <InputGroup>
//               <Input
//                 type={showPassword ? "text" : "password"}
//                 name="password"
//                 required
//                 value={formData.password}
//                 onChange={(e) => setFormData({ ...formData, password: e.target.value })}
//               />
//               <InputElement placement="end">
//                 <IconButton
//
//                   onClick={() => setShowPassword(!showPassword)}
//                   variant="ghost"
//                   aria-label="Toggle Password Visibility"
//>showPassword ? <ViewOffIcon /> : <ViewIcon /></IconButton>
//               </InputElement>
//             </InputGroup>
//           </Field.Root>
//           <Button type="submit" colorPalette="teal" width="full" mb={4}>
//             Sign In
//           </Button>
//           {message && (
//             <Text color="red.500" textAlign="center" mb={4}>
//               {message}
//             </Text>
//           )}
//         </form>
//         <Link href="/auth/forgot-password" passHref>
//           <Button variant="plain" colorPalette="teal" width="full" mb={2}>
//             Forgotten Password?
//           </Button>
//         </Link>
//         <Link href="/auth/signup" passHref>
//           <Button variant="plain" colorPalette="teal" width="full">
//             Don’t have an Account? Sign Up
//           </Button>
//         </Link>
//       </Box>
//     </Center>
//   );
// }


// "use client";

// import { createClient } from "@/utils/supabase/client";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { useEffect, useState } from "react";
// import {
// 	Box,
// 	Heading,
//, //, // 	Input,
// 	Button,
// 	Text,
// 	Center,
// 	Spinner,
//, // 	useToast,
// } from "@chakra-ui/react";
// import { User } from "@supabase/supabase-js"; // Import the User type

// export default function LoginPage() {
// 	const [email, setEmail] = useState("");
// 	const [password, setPassword] = useState("");
// 	const router = useRouter();
// 	const [user, setUser] = useState<User | null>(null); // Use User | null type
// 	const [loading, setLoading] = useState(true);
// 	  const [isAuthenticated, setIsAuthenticated] = useState(false);
// 	const toast = useToast();

// 	const supabase = createClient();

// 	useEffect(() => {
// 		const checkUser = async () => {
// 		  const { data: { user } } = await supabase.auth.getUser();
// 		  if (user) {
// 			setIsAuthenticated(true);
// 			router.push("/");
// 		  } else {
// 			setLoading(false);
// 		  }
// 		};
// 		checkUser();

// 		// const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
// 		// 	if (event === "SIGNED_IN") {
// 		// 	  setIsAuthenticated(true);
// 		// 	  router.refresh(); // Refresh the browser
// 		// 	  // router.push("/");
// 		// 	  // window.location.reload();
// 		// 	}
// 		//   });

// 		//   // Cleanup subscription on unmount
// 		//   return () => {
// 		// 	authListener.subscription.unsubscribe();
// 		//   };
// 	  }, [router, supabase.auth]);


// 	// useEffect(() => {
// 	// 	async function getUser() {
// 	// 		const {
// 	// 			data: { user },
// 	// 		} = await supabase.auth.getUser();
// 	// 		setUser(user);
// 	// 		setLoading(false);
// 	// 	}

// 	// 	getUser();
// 	// }, []);

// 	const handleSignUp = async () => {
// 		const res = await supabase.auth.signUp({
// 			email,
// 			password,
// 			options: {
// 				emailRedirectTo: `${location.origin}/auth/callback`,
// 			},
// 		});
// 		setUser(res.data.user);
// 		router.push("/"); // Navigate to the homepage
// 		setTimeout(() => window.location.reload(), 1000);
// 		setEmail("");
// 		setPassword("");
// 	};

// 	const handleSignIn = async () => {
// 		const res = await supabase.auth.signInWithPassword({
// 			email,
// 			password,
// 		});
// 		if (res.error) {
// 			toast({
// 				title: "Authentication Failed",
// 				description: res.error.message,
// 				status: "error",
// 				duration: 9000,
// 				isClosable: true,
// 				position: "top",
// 			});
// 		} else {
// 			setUser(res.data.user);
// 			router.push("/"); // Navigate to the homepage
// 			setTimeout(() => window.location.reload(), 1000); // Refresh after navigation
// 			setEmail("");
// 			setPassword("");
// 			toast({
// 				title: "Logged In Successfully",
// 				description: "You have successfully logged in.",
// 				status: "success",
// 				duration: 5000,
// 				isClosable: true,
// 				position: "top",
// 			});
// 		}
// 	};

// 	const handleLogout = async () => {
// 		await supabase.auth.signOut();
// 		router.refresh();
// 		setUser(null);
// 	};

// 	if (loading) {
// 		return (
// 			<Center minH="100vh">
// 				<Spinner size="xl" />
// 			</Center>
// 		);
// 	}

// 	if (user) {
// 		return (
// 			<Center>
// 				<Box p={8} maxWidth="400px" width="full" boxShadow="md" borderRadius="md" textAlign="center">
// 					<Heading as="h1" size="lg" mb={6}>
// 						You are already logged in
// 					</Heading>
// 					<Button onClick={handleLogout} colorPalette="red" width="full">
// 						Logout
// 					</Button>
// 				</Box>
// 			</Center>
// 		);
// 	}

// 	return (
// 		<Center>
// 			<Box p={8} maxWidth="400px" width="full" boxShadow="md" borderRadius="md">
// 				<Heading as="h1" size="lg" mb={6} textAlign="center">
// 					Sign In
// 				</Heading>
// 				<Field.Root id="email" mb={4}>
// 					<Field.Label>Email</Field.Label>
// 					<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
// 				</Field.Root>
// 				<Field.Root id="password" mb={4}>
// 					<Field.Label>Password</Field.Label>
// 					<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
// 				</Field.Root>
// 				{/* <Button
//                     onClick={handleSignUp}
//                     colorPalette="blue"
//                     width="full"
//                     mb={4}
//                 >
//                     Sign Up
//                 </Button> */}
// 				<Button onClick={handleSignIn} colorPalette="teal" width="full">
// 					Sign In
// 				</Button>
// 				<Link href="/auth/forgot-password" passHref>
// 					<Button variant="plain" colorPalette="teal" width="full" mt={4}>
// 						Forgotten Password?
// 					</Button>
// 				</Link>
// 				<Link href="/auth/signup" passHref>
// 					<Button variant="plain" colorPalette="teal" width="full" mt={4}>
// 						Don’t have an Account? Sign Up
// 					</Button>
// 				</Link>
// 			</Box>
// 		</Center>
// 	);
// }
