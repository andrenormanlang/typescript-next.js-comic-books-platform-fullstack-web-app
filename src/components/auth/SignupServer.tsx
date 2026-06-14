"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import {Field,
  Box,
  Heading, Input,
  Button,
  Text,
  Center, Spinner,
  InputGroup, IconButton,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useForm, SubmitHandler } from "react-hook-form";

const passwordValidation = new RegExp(
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[#?!@$%^&*-]).{6,}$/
);

const validationSchema = z.object({
  fullname: z
    .string()
    .min(1, { message: 'Full name is required' })
    .refine((name) => {
      const names = name.trim().split(/\s+/);
      return names.length >= 2 && names.every((n) => n.length >= 2);
    }, { message: 'Full name must be at least two names with 2 characters each' }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers and underscores' }),
  email: z
    .string()
    .min(5, { message: 'Must have at least 5 characters' })
    .email({ message: 'Must be a valid email' }),
  password: z
    .string()
    .min(6, { message: 'Must have at least 6 characters long' })
    .regex(passwordValidation, { message: 'Your password must have at least one uppercase letter, one special character, and one number' }),
  confirmPassword: z.string().min(6, { message: 'Must have at least 6 characters' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"], // Set the path of the error
});

type SchemaProps = z.infer<typeof validationSchema>;

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams?.get("message");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchemaProps>({
    resolver: zodResolver(validationSchema)
  });

  const supabase = createClientComponentClient();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const bgCenter = useColorModeValue("gray.50", "gray.800");
  const bgBox = useColorModeValue("white", "gray.700");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsAuthenticated(true);
        router.push("/");
      } else {
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        setIsAuthenticated(true);
        router.push("/");
      }
    });

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const signUp: SubmitHandler<SchemaProps> = async (data) => {
    const { email, password, fullname, username } = data;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        data: {
          full_name: fullname,
          username,
        },
      },
    });

    if (error) {
      toaster.create({
        title: "Sign up error",
        description: error.message,
        type: "error",
        duration: 9000,
      });
    } else {
      toaster.create({
        title: "Sign up success",
        description: `Check your email (${email}) to continue sign in process`,
        type: "success",
        duration: 9000,
      });
      // router.push(`/auth/confirm?message=Check email(${email}) to continue sign in process`);
    }
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (isAuthenticated) {
    router.push(`/auth/login`);
    return null;
  }

  return (
    <Center bg={bgCenter} minH="100vh">
      <Box
        p={8}
        maxWidth="400px"
        width="full"
        boxShadow="md"
        borderRadius="md"
        bg={bgBox}
      >
        <Heading as="h1" size="lg" mb={6} textAlign="center">
          Sign Up
        </Heading>
        <form onSubmit={handleSubmit(signUp)}>
          <Field.Root id="fullname" mb={4} required invalid={!!errors.fullname}>
            <Field.Label>
              Full Name <Field.RequiredIndicator />
            </Field.Label>
            <Input type="text" {...register('fullname')} />
            {errors.fullname && <Text color="red.500">{errors.fullname.message}</Text>}
          </Field.Root>
          <Field.Root id="username" mb={4} required invalid={!!errors.username}>
            <Field.Label>
              Username <Field.RequiredIndicator />
            </Field.Label>
            <Input type="text" {...register('username')} />
            {errors.username && <Text color="red.500">{errors.username.message}</Text>}
          </Field.Root>
          <Field.Root id="email" mb={4} required invalid={!!errors.email}>
            <Field.Label>
              Email <Field.RequiredIndicator />
            </Field.Label>
            <Input type="email" {...register('email', { required: true })} />
            {errors.email && <Text color="red.500">{errors.email.message}</Text>}
          </Field.Root>
          <Field.Root id="password" mb={4} invalid={!!errors.password}>
            <Field.Label>Password</Field.Label>
            <InputGroup endElement={
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                variant="ghost"
                aria-label="Toggle Password Visibility">
                {showPassword ? <EyeOff /> : <Eye />}
              </IconButton>
            }>
              <Input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                name="password"
                required
              />
            </InputGroup>
            {errors.password && <Text color="red.500">{errors.password.message}</Text>}
          </Field.Root>
          <Field.Root id="confirmPassword" mb={4} invalid={!!errors.confirmPassword}>
            <Field.Label>Confirm Password</Field.Label>
            <InputGroup endElement={
              <IconButton
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                variant="ghost"
                aria-label="Toggle Confirm Password Visibility">
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </IconButton>
            }>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                name="confirmPassword"
                required
              />
            </InputGroup>
            {errors.confirmPassword && <Text color="red.500">{errors.confirmPassword.message}</Text>}
          </Field.Root>
          <Button type="submit" colorPalette="teal" width="full" mb={4}>
            Sign Up
          </Button>
          {message && (
            <Text color="red.500" textAlign="center" mb={4}>
              {message}
            </Text>
          )}
        </form>
        <Link href="/auth/login" passHref>
          <Button type="button" variant="plain" colorPalette="teal" width="full">
            Already have an account? Sign In
          </Button>
        </Link>
      </Box>
    </Center>
  );
}
