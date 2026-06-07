"use client";

import { useColorModeValue } from "@/components/ui/color-mode";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {Field,
  Box,
  Heading, Input,
  Button,
  Text,
  Center,
  Spinner,
  InputGroup, IconButton } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { z, ZodError } from "zod";
import { useDispatch } from 'react-redux';
import { setAccessToken } from '@/store/authSlice';

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const validationSchema = z.object({
  email: z.string().email("Must be a valid email"),
  password: passwordSchema,
});

interface LoginProps {
  message?: string;
}

export default function LoginServer({ message }: LoginProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const supabase = createClient();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

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
        router.refresh();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { email, password } = formData;

    try {
      validationSchema.parse({ email, password });
    } catch (err) {
      if (err instanceof ZodError) {
        err.errors.forEach((error) => {
          toaster.create({
            title: "Validation Error",
            description: error.message,
            type: "error",
            duration: 9000,
          });
        });
        return;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toaster.create({
        title: "Authentication Failed",
        description: error.message,
        type: "error",
        duration: 9000,
      });
      router.push("/auth/login?message=Could not authenticate user");
    } else {
      dispatch(setAccessToken(data.session.access_token));
      setIsAuthenticated(true);
      router.refresh();
      toaster.create({
        title: "Logged In Successfully",
        description: "You have successfully logged in.",
        type: "success",
        duration: 5000,
      });
      router.push("/");
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
    window.location.reload();
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
          Sign In
        </Heading>
        <form onSubmit={signIn}>
          <Field.Root id="email" mb={4}>
            <Field.Label>Email</Field.Label>
            <Input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </Field.Root>
          <Field.Root id="password" mb={4}>
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
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </InputGroup>
          </Field.Root>
          <Button type="submit" colorPalette="teal" width="full" mb={4}>
            Sign In
          </Button>
          {message && (
            <Text color="red.500" textAlign="center" mb={4}>
              {message}
            </Text>
          )}
        </form>
        <Link href="/auth/forgot-password" passHref>
          <Button variant="plain" colorPalette="teal" width="full" mb={2}>
            Forgotten Password?
          </Button>
        </Link>
        <Link href="/auth/signup" passHref>
          <Button variant="plain" colorPalette="teal" width="full">
            Don’t have an Account? Sign Up
          </Button>
        </Link>
      </Box>
    </Center>
  );
}
