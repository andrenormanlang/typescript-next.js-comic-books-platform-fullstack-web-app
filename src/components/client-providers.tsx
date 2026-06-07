"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Box, ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ColorModeProvider } from "@/components/ui/color-mode";
import { AppToaster } from "@/components/ui/toaster";
import ReduxProvider from "@/contexts/ReduxProvider";
import { UserProvider } from "@/contexts/UserContext";
import ReactQueryProvider from "@/lib/react-query-provider";
import EmotionRegistry from "@/lib/emotion-registry";

const Navbar = dynamic(() => import("@/components/partials/navbar"), { ssr: false });

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <EmotionRegistry>
      <ChakraProvider value={defaultSystem}>
        <ColorModeProvider>
          <ReactQueryProvider>
            <ReduxProvider>
              <UserProvider>
                {mounted && <AppToaster />}
                <Navbar />
                <Box mt="8rem" className="container">
                  {children}
                </Box>
              </UserProvider>
            </ReduxProvider>
          </ReactQueryProvider>
        </ColorModeProvider>
      </ChakraProvider>
    </EmotionRegistry>
  );
}
