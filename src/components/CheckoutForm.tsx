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
import { CartItem } from "@/types/comics-store/comic-detail.type";
import { useUser } from "@/contexts/UserContext";


interface CheckoutFormProps {
  amount: number;
  cartItems: CartItem[];
  onPaymentSuccess: (amount: number) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ amount, cartItems, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useUser();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    if (!stripe || !elements) {
      return;
    }

    const response = await fetch("/api/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, userId: user?.id, cartItems }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Error creating payment intent:", data.error);
      toaster.create({
        title: "Payment error",
        description: data.error,
        type: "error",
        duration: 5000,
      });
      setLoading(false);
      return;
    }

    const { error: submitError } = await elements.submit();

    if (submitError) {
      console.error("Error submitting payment form:", submitError);
      setErrorMessage(submitError.message);
      toaster.create({
        title: "Payment error",
        description: submitError.message,
        type: "error",
        duration: 5000,
      });
      setLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?orderId=${data.orderId}&userId=${user?.id}`,
      },
    });

    if (error) {
      console.error("Error confirming payment:", error);
      setErrorMessage(error.message);
      toaster.create({
        title: "Payment error",
        description: error.message,
        type: "error",
        duration: 5000,
      });
    } else {
      await fetch("/api/confirm-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: data.orderId, cartItems }),
      });

      onPaymentSuccess(amount);

      // Dispatch custom event
      const paymentSuccessEvent = new CustomEvent('paymentSuccess', {
        detail: {
          userId: user?.id,
          orderId: data.orderId,
        },
      });
      window.dispatchEvent(paymentSuccessEvent);
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
        {!loading ? `Pay $${(amount) }` : "Processing..."}
      </Button>
    </form>
  );
};

export default CheckoutForm;
