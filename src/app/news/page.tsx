import { Suspense } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import ComicsNewsClient from "@/components/ComicsNewsClient";

export const metadata = {
  title: "Comics News | Retro Pop Comics",
  description: "Latest comics news and trending articles from across the comics world.",
};

export default function NewsPage() {
  return (
    <Suspense fallback={<Center h="40vh"><Spinner size="xl" color="blue.400" /></Center>}>
      <ComicsNewsClient />
    </Suspense>
  );
}
