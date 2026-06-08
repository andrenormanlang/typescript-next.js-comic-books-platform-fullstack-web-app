import { useQuery } from "@tanstack/react-query";

export interface ProcessedArticle {
  id: string;
  rwBody?: string;
  rephrasedTitle?: string;
  rephrasedDescription?: string;
  rwTitle?: string;
  rwDescription?: string;
  rwAvailability?: string;
  slug?: string;
}

async function fetchArticle(url: string): Promise<ProcessedArticle> {
  const res = await fetch(`/api/news/article?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Failed to fetch article: ${res.status}`);
  return res.json();
}

export const useGetArticle = (articleUrl: string | null) => {
  return useQuery({
    queryKey: ["comicsArticle", articleUrl],
    queryFn: () => fetchArticle(articleUrl!),
    enabled: !!articleUrl,
    staleTime: 10 * 60 * 1000,
  });
};
