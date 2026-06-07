import { useQuery } from "@tanstack/react-query";

async function fetchMarvelSeries(searchTerm: string, page: number, pageSize: number) {
	const url = new URL("/api/marvel/marvel-series", window.location.origin);

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

export const useGetMarvelSeries = (searchTerm: string, page: number, pageSize: number) => {
	return useQuery({
		queryFn: () => fetchMarvelSeries(searchTerm, page, pageSize),
		queryKey: ["marvel-series", searchTerm, page, pageSize],
	});
};

// This function fetches details of a single superhero
async function fetchMarvelSerie(comicId: string) {
	const response = await fetch(`/api/marvel/marvel-series/${comicId}`);

	if (!response.ok) {
		throw new Error(`API call failed with status: ${response.status}`);
	}

	return response.json();
}

// This hook uses the fetchSuperhero function to fetch data
export const useGetMarvelSerie = (comicId: string) => {
	return useQuery({
		queryFn: () => fetchMarvelSerie(comicId),
		queryKey: ["marvel-series-detail", comicId],
	});
};
