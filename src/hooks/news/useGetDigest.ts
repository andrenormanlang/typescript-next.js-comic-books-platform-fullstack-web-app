import { useQuery } from "@tanstack/react-query";
import { Digest } from "@/types/news/digest.type";

async function fetchDigest(): Promise<Digest | null> {
  const res = await fetch("/api/news/digest");
  if (!res.ok) return null;
  const data = await res.json();
  return data?.digest ?? null;
}

export const useGetDigest = () => {
  return useQuery({
    queryKey: ["comicsNews", "digest"],
    queryFn: fetchDigest,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
};
