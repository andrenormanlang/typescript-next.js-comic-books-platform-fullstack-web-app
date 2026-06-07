'use client';

import { Field, Input, Button, Box, Text, Link } from '@chakra-ui/react';
import { toaster } from "@/components/ui/toaster";
import { FormEvent, useState } from "react";
import { z, ZodError } from 'zod';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const emailSchema = z.string().email("Email is not valid");
const ForgotPasswordSchema = z.object({
  email: emailSchema,
});

type FormData = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordForm() {
  const supabase = createClientComponentClient();
  const [formData, setFormData] = useState<FormData>({ email: "" });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      ForgotPasswordSchema.parse(formData);
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

	const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
		redirectTo: `${window.location.origin}/api/auth/callback-password`,
	  });
    if (error) {
      toaster.create({
        title: "Error",
        description: error.message,
        type: "error",
        duration: 9000,
      });
      return;
    }

    setFormData({ email: "" });
    toaster.create({
      title: "Success",
      description: "Please check your email for a password reset link to log into the website.",
      type: "success",
      duration: 9000,
    });
  };

  return (
    <Box width={["90%", "80%", "60%", "50%", "30%"]} p={8} maxWidth="400px" boxShadow="md" borderRadius="md" >
      <Text fontSize="xl" fontWeight="semibold" mb={4}>Forgot Password</Text>
      <Text mb={4}>Looks like you´ve forgotten your password</Text>
      <form onSubmit={handleSubmit}>
        <Field.Root id="email" invalid={!!formData.email}>
          <Field.Label>Email</Field.Label>
          <Input type="email" value={formData.email} onChange={(ev) => setFormData({ ...formData, email: ev.target.value })} />
        </Field.Root>
        <Button mt={6} colorPalette="blue" type="submit">Send</Button>
      </form>
      <Text pt={4} textAlign="center">
        Not registered yet? <Link href="/auth/signup" color="blue.500">Create an account</Link>
      </Text>
    </Box>
  );
}
