import { useQuery } from "@tanstack/react-query";

export interface DispatchArticle {
  id: string;
  title: string;
  description: string;
  rwBody?: string;
  pubDate: string;
  pubTS: number;
  slug?: string;
  rssUrl: string;
  imageUrl?: string;
  likes?: { users: string[] };
  dislikes?: { users: string[] };
  msgCount?: number;
  interestCount?: number;
  subjects?: { id: number; users: string[] }[];
}

async function fetchTrendingNews(): Promise<DispatchArticle[]> {
  const response = await fetch("/api/news/trending");
  if (!response.ok) {
    throw new Error(`Failed to fetch trending news: ${response.status}`);
  }
  const data = await response.json();
  return data;
}

export const useGetTrendingNews = () => {
  return useQuery({
    queryKey: ["comicsNews", "trending"],
    queryFn: fetchTrendingNews,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};
