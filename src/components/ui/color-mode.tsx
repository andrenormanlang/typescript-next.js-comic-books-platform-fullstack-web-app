"use client";

import { IconButton } from "@chakra-ui/react";
import { ThemeProvider, useTheme } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

export function ColorModeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange {...props}>
      {children}
    </ThemeProvider>
  );
}

export function useColorMode() {
  const { resolvedTheme, setTheme } = useTheme();
  return {
    colorMode: resolvedTheme as "light" | "dark",
    toggleColorMode: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
  };
}

export function useColorModeValue<T>(light: T, dark: T): T {
  const { colorMode } = useColorMode();
  // Default to dark to match defaultTheme="dark" when resolvedTheme is undefined (SSR)
  return colorMode === "light" ? light : dark;
}

export function ColorModeButton() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton aria-label="Toggle color mode" variant="ghost" size="sm" onClick={toggleColorMode}>
      {colorMode === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </IconButton>
  );
}
