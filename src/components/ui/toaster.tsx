"use client";

import { createToaster, Toaster } from "@chakra-ui/react";

export const toaster = createToaster({
  placement: "top",
  pauseOnPageIdle: true,
});

export function AppToaster() {
  const T = Toaster as any;
  return <T toaster={toaster} />;
}
