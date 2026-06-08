import { useQuery } from "@tanstack/react-query";
import { DispatchArticle } from "./useGetTrendingNews";

async function fetchArticle(url: string, sortKey: string): Promise<DispatchArticle> {
  const res = await fetch(
    `/api/news/article?url=${encodeURIComponent(url)}&sortKey=${encodeURIComponent(sortKey)}`
  );
  if (!res.ok) throw new Error(`Failed to fetch article: ${res.status}`);
  return res.json();
}

export const useGetArticle = (articleUrl: string | null, sortKey: string | null) => {
  return useQuery({
    queryKey: ["comicsArticle", articleUrl],
    queryFn: () => fetchArticle(articleUrl!, sortKey!),
    enabled: !!articleUrl && !!sortKey,
    staleTime: 10 * 60 * 1000,
  });
};
