"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";

export default function ReactQueryProvider({ children }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Set a reasonable staleTime (e.g., 5 minutes)
						staleTime: 5 * 60 * 1000, // 5 minutes
						// Disable refetchInterval by default
						refetchInterval: false,
						// Prevent refetching on window focus
						refetchOnWindowFocus: false,
						// Refetch on mount if data is stale
						refetchOnMount: "always",
						// Use gcTime instead of cacheTime
						gcTime: 24 * 60 * 60 * 1000, // 24 hours
					},
				},
			}),
	);

	return (
		<SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false} refetchInterval={0}>
			<QueryClientProvider client={queryClient}>
				<ReactQueryDevtools />
				{children}
			</QueryClientProvider>
		</SessionProvider>
	);
}
