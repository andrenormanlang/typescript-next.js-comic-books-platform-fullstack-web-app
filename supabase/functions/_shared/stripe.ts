import Stripe from "npm:stripe@16.12.0";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
	apiVersion: "2024-06-20",
	// Deno has no Node http module; use fetch.
	httpClient: Stripe.createFetchHttpClient(),
});

// Web Crypto provider for verifying webhook signatures in Deno.
export const cryptoProvider = Stripe.createSubtleCryptoProvider();

export type { Stripe };
