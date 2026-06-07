// components/StripeCheckout.tsx

import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Box, Button, Spinner, Text } from "@chakra-ui/react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CheckoutForm: React.FC<{ amount: number }> = ({ amount }) => {
	const stripe = useStripe();
	const elements = useElements();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!stripe || !elements) {
			return;
		}

		setLoading(true);

		const response = await fetch("/api/create-order", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ amount }),
		});

		const { clientSecret } = await response.json();

		const result = await stripe.confirmCardPayment(clientSecret, {
			payment_method: {
				card: elements.getElement(CardElement)!,
			},
		});

		if (result.error) {
			setError(result.error.message!);
			setLoading(false);
		} else {
			if (result.paymentIntent?.status === "succeeded") {
				setSuccess(true);
				setLoading(false);
			}
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<CardElement />
			{error && <Text color="red.500">{error}</Text>}
			{success ? (
				<Text color="green.500">Payment succeeded!</Text>
			) : (
				<Button type="submit" loading={loading} mt={4} colorPalette="blue" disabled={!stripe || loading}>
					Pay
				</Button>
			)}
		</form>
	);
};

const StripeCheckout: React.FC<{ amount: number }> = ({ amount }) => {
	return (
		<Elements stripe={stripePromise}>
			<Box p={4} maxWidth="400px" mx="auto">
				<CheckoutForm amount={amount} />
			</Box>
		</Elements>
	);
};

export default StripeCheckout;
