import { useQuery } from "@tanstack/react-query";

async function fetchMarvelCreators(searchTerm: string, page: number, pageSize: number) {
	const url = new URL("/api/marvel/marvel-creators", window.location.origin);

	url.searchParams.append("page", page.toString());
	url.searchParams.append("limit", pageSize.toString());

	if (searchTerm) {
		url.searchParams.append("query", searchTerm);
	}

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`API call failed with status: ${response.status}`);
	}

	return response.json();
}

export const useGetMarvelCreators = (searchTerm: string, page: number, pageSize: number) => {
	return useQuery({
		queryFn: () => fetchMarvelCreators(searchTerm, page, pageSize),
		queryKey: ["marvel-creators", searchTerm, page, pageSize],
	});
};

// This function fetches details of a single superhero
async function fetchMarvelCreator(comicId: string) {
	const response = await fetch(`/api/marvel/marvel-creators/${comicId}`);

	if (!response.ok) {
		throw new Error(`API call failed with status: ${response.status}`);
	}

	return response.json();
}

// This hook uses the fetchSuperhero function to fetch data
export const useGetMarvelCreator = (comicId: string) => {
	return useQuery({
		queryFn: () => fetchMarvelCreator(comicId),
		queryKey: ["marvel-creators-detail", comicId],
	});
};
