import { useQuery } from "@tanstack/react-query";

// Fast endpoint - returns basic info only
async function fetchComicsQuick(searchTerm: string, page: number) {
	const url = new URL("/api/comicbooks-api/quick", window.location.origin);
	url.searchParams.append("page", page.toString());

	if (searchTerm) {
		url.searchParams.append("query", searchTerm);
	}

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`API call failed with status: ${response.status}`);
	}
	return response.json();
}

// Original endpoint - returns full details (slower but complete)
async function fetchComics(searchTerm: string, page: number, pageSize: number) {
	const url = new URL("/api/comicbooks-api", window.location.origin);

	url.searchParams.append("page", page.toString());
	url.searchParams.append("pageSize", pageSize.toString());

	if (searchTerm) {
		url.searchParams.append("query", searchTerm);
	}

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`API call failed with status: ${response.status}`);
	}
	return response.json();
}

// Fetch details for a single comic
async function fetchComicDetails(comicUrl: string) {
	const url = new URL("/api/comicbooks-api/details", window.location.origin);
	url.searchParams.append("url", comicUrl);

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`Failed to fetch comic details: ${response.status}`);
	}
	return response.json();
}

// Hook for quick listing (fast, basic info)
export const useGetComicBooksQuick = (search: string, page: number) => {
	return useQuery({
		queryFn: async () => fetchComicsQuick(search, page),
		queryKey: ["comics-quick", search, page],
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Hook for full listing (slower, complete info) - original
export const useGetComicBooksApi = (search: string, page: number, pageSize: number) => {
	return useQuery({
		queryFn: async () => fetchComics(search, page, pageSize),
		queryKey: ["comics", search, page],
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Hook for single comic details
export const useGetComicDetails = (comicUrl: string, enabled: boolean = true) => {
	return useQuery({
		queryFn: async () => fetchComicDetails(comicUrl),
		queryKey: ["comic-details", comicUrl],
		enabled: enabled && !!comicUrl,
		staleTime: 60 * 60 * 1000, // 1 hour - details don't change often
	});
};
