'use client';

import { Field, Input, Button, Box, Text, InputGroup, IconButton } from '@chakra-ui/react';
import { toaster } from "@/components/ui/toaster";
import { useState, FormEvent } from "react";
import { z, ZodError } from "zod";
import { User, createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Eye, EyeOff } from "lucide-react";

// Define a Zod schema for password validation directly
const passwordSchema = z.string()
  .min(6, "Password must be at least 6 characters")
  .regex(/^(?=.*[A-Z])(?=.*[#?!@$%^&*-]).*$/, "Password must have at least one uppercase letter and one special character");

const UpdatePasswordSchema = z.object({
  password: passwordSchema,
  passwordConfirm: passwordSchema
}).superRefine(({ password, passwordConfirm }, ctx) => {
  if (password !== passwordConfirm) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords do not match",
      path: ["passwordConfirm"]
    });
  }
});

type FormData = z.infer<typeof UpdatePasswordSchema>;

export default function PasswordForm({ user }: { user: User | undefined }) {
  const supabase = createClientComponentClient();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ password: "", passwordConfirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { password, passwordConfirm } = formData;

    try {
      UpdatePasswordSchema.parse({ password, passwordConfirm });
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

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toaster.create({
        title: "Error Updating Password",
        description: error.message,
        type: "error",
        duration: 9000,
      });
      return;
    }

    setFormData({ password: "", passwordConfirm: "" });
    toaster.create({
      title: "Success",
      description: "Your password was updated successfully.",
      type: "success",
      duration: 9000,
    });
  };

  const handleReset = async () => {
    try {
      window.location.href = "/auth/login";
    } catch (error) {
      setError("Error updating password!");
    }
  };

  return (
    <Box width={["90%", "80%", "60%", "50%", "30%"]} p={8} maxWidth="400px" boxShadow="md" borderRadius="md" >
      <Text fontSize="xl" fontWeight="semibold" mb={4}>Update Password</Text>
      <Text mb={4}>Hi {user?.email}, enter your new password below and confirm it.</Text>
      <form onSubmit={handleSubmit}>
        <Field.Root invalid={formData.password !== ""}>
          <Field.Label htmlFor="password">Password</Field.Label>
          <InputGroup endElement={
            <IconButton
              onClick={() => setShowPassword(!showPassword)}
              variant="ghost"
              aria-label="Toggle Password Visibility">showPassword ? <EyeOff /> : <Eye /></IconButton>
          }>
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </InputGroup>
        </Field.Root>
        <Field.Root invalid={formData.passwordConfirm !== ""} mt={4}>
          <Field.Label htmlFor="passwordConfirm">Confirm Password</Field.Label>
          <InputGroup endElement={
            <IconButton
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              variant="ghost"
              aria-label="Toggle Confirm Password Visibility">showConfirmPassword ? <EyeOff /> : <Eye /></IconButton>
          }>
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.passwordConfirm}
              onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
            />
          </InputGroup>
        </Field.Root>
        <Button colorPalette="blue" mt={6} type="submit" onClick={handleReset}>Update Password & Login</Button>
      </form>
    </Box>
  );
}

