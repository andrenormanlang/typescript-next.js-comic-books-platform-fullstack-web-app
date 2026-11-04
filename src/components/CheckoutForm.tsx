import React, { useState } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import {
  Button,
  Center,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";


interface CheckoutFormProps {
  amount: number;
  orderId: number;
}

// The order and PaymentIntent are created by CartDrawer (/api/create-order).
// Stripe redirects to /payment-success, which waits for the stripe-webhook
// Edge Function to mark the order paid. Nothing here touches stock or receipts.
const CheckoutForm: React.FC<CheckoutFormProps> = ({ amount, orderId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  const showError = (message?: string) => {
    setErrorMessage(message);
    toaster.create({
      title: "Payment error",
      description: message,
      type: "error",
      duration: 5000,
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const { error: submitError } = await elements.submit();

    if (submitError) {
      showError(submitError.message);
      setLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?orderId=${orderId}`,
      },
    });

    // confirmPayment only returns here on failure; on success Stripe redirects.
    if (error) {
      showError(error.message);
    }

    setLoading(false);
  };

  if (!stripe || !elements) {
    return (
      <Center>
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "1rem", borderRadius: "0.375rem", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
      <PaymentElement />

      {errorMessage && <Text color="red.500" mt={2}>{errorMessage}</Text>}

      <Button
        mt={4}
        colorPalette="blue"
        type="submit"
        loading={loading}
        disabled={!stripe || loading}
        width="full"
      >
        {!loading ? `Pay $${amount.toFixed(2)}` : "Processing..."}
      </Button>
    </form>
  );
};

export default CheckoutForm;
