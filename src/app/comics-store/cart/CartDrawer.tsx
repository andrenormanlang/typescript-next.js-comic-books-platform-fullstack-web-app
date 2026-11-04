import React, { useEffect, useState } from "react";
import {
	Box,
	Flex,
	Image,
	Text,
	IconButton,
	Drawer,
	Button,
	Center,
	Spinner,
	Alert,
	Input,
	Dialog,
	Portal,
	CloseButton,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchCart, removeFromCart, updateCartQuantity } from "@/store/cartSlice";
import { CartItem } from "@/types/comics-store/comic-detail.type";
import { useUser } from "../../../contexts/UserContext";
import CheckoutForm from "@/components/CheckoutForm";
import { Elements } from "@stripe/react-stripe-js";
import getStripe from "@/utils/get-stripejs";
import { supabase } from "@/utils/supabase/client";
import { Appearance } from "@stripe/stripe-js";

interface PaymentSuccessDetail {
	userId: string;
}

interface OrderData {
	amount: number;
	items: CartItem[];
	orderId: number;
}

interface CartDrawerProps {
	isOpen: boolean;
	onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
	const dispatch = useDispatch<AppDispatch>();
	const { user } = useUser();
	const cartItems = useSelector((state: RootState) => state.cart.items);
	const loading = useSelector((state: RootState) => state.cart.loading);
	const error = useSelector((state: RootState) => state.cart.error);

	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedComicId, setSelectedComicId] = useState<string | null>(null);
	const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
	const [totalAmount, setTotalAmount] = useState(0);
	const [clientSecret, setClientSecret] = useState("");
	const [orderData, setOrderData] = useState<OrderData | null>(null);

	useEffect(() => {
		if (user) {
			dispatch(fetchCart({ userId: user.id }));
		}

		const handlePaymentSuccess = (event: CustomEvent<PaymentSuccessDetail>) => {
			if (event.detail.userId === user?.id) {
				// The stripe-webhook Edge Function already removed the bought items.
				dispatch(fetchCart({ userId: event.detail.userId }));
			}
		};

		window.addEventListener("paymentSuccess", handlePaymentSuccess as EventListener);

		return () => {
			window.removeEventListener("paymentSuccess", handlePaymentSuccess as EventListener);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user, dispatch]);

	const handleRemoveFromCart = async (comicId: string) => {
		if (!user) return;

		// Stock is only reserved at checkout, so removing an item is cart-only.
		dispatch(removeFromCart({ userId: user.id, comicId }))
			.unwrap()
			.then(() => {
				toaster.create({
					title: "Comic removed from cart.",
					description: "The comic has been removed from your cart.",
					type: "success",
					duration: 5000,
				});
			})
			.catch(() => {
				toaster.create({
					title: "Error removing from cart.",
					description: "There was an error removing the comic from your cart.",
					type: "error",
					duration: 5000,
				});
			});
	};

	const confirmRemoveFromCart = (comicId: string) => {
		setSelectedComicId(comicId);
		setIsDeleteDialogOpen(true);
	};

	const handleStockChange = async (comicId: string, newQuantity: number) => {
		if (!user) return;

		const existingItem = cartItems.find((item) => item.comicId === comicId);

		if (!existingItem) return;

		if (newQuantity < 1) {
			confirmRemoveFromCart(comicId);
			return;
		}

		const { data: comicData, error: comicError } = await supabase
			.from("comics-sell")
			.select("stock")
			.eq("id", comicId)
			.single();

		if (comicError || !comicData) {
			toaster.create({
				title: "Error updating stock.",
				description: "There was an error updating the stock or insufficient stock available.",
				type: "error",
				duration: 5000,
			});
			return;
		}

		// Stock isn't taken until checkout; just make sure enough copies exist.
		if (newQuantity > comicData.stock) {
			toaster.create({
				title: "Insufficient stock",
				description: "You cannot add more of this comic to your cart.",
				type: "error",
				duration: 5000,
			});
			return;
		}

		dispatch(updateCartQuantity({ userId: user.id, comicId, quantity: newQuantity }))
			.unwrap()
			.then(() => {
				toaster.create({
					title: "Cart updated.",
					description: "The quantity has been updated.",
					type: "success",
					duration: 5000,
				});
			})
			.catch((error) => {
				toaster.create({
					title: "Error updating cart.",
					description: error.message,
					type: "error",
					duration: 5000,
				});
			});
	};

	// Display only; the charged amount is computed server-side.
	const calculateTotalAmount = () => {
		return cartItems.reduce((total, item) => total + item.quantity * item.price, 0);
	};

	const handleCheckout = async () => {
		if (!user) return;

		// Only ids and quantities are sent; the server prices the order and
		// reserves the stock for 30 minutes.
		const response = await fetch("/api/create-order", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				items: cartItems.map((item) => ({ comicId: item.comicId, quantity: item.quantity })),
			}),
		});

		const data = await response.json();

		if (!response.ok || data.error) {
			toaster.create({
				title: response.status === 409 ? "Sold out" : "Payment Error",
				description: data.error,
				type: "error",
				duration: 5000,
			});
			if (response.status === 409) {
				dispatch(fetchCart({ userId: user.id }));
			}
			return;
		}

		setTotalAmount(data.amount);
		setClientSecret(data.clientSecret);
		setOrderData({ amount: data.amount, items: cartItems, orderId: data.orderId });
		setIsCheckoutOpen(true);
	};


	// Stripe UI appearance customization
	const appearance: Appearance = {
		theme: "night",
		variables: {
			colorPrimary: "#0570de",
			colorText: "#e0e0e0",
			colorTextSecondary: "#b3b3b3",
			colorDanger: "#ef5350",
			borderRadius: "6px",
		},
		labels: "floating",
	};

	return (
		<>
			<Drawer.Root open={isOpen} onOpenChange={(e) => { if (!e.open) onClose(); }} placement="end" size={{ base: "full", md: "md" }}>
				<Drawer.Backdrop />
				<Drawer.Positioner>
					<Drawer.Content>
						<Drawer.CloseTrigger asChild position="absolute" top="3" insetEnd="4">
							<CloseButton size="sm" />
						</Drawer.CloseTrigger>
						<Drawer.Header><Drawer.Title>Your Cart</Drawer.Title></Drawer.Header>
						<Drawer.Body>
							{loading ? (
								<Center h="100%">
									<Spinner size="xl" />
								</Center>
							) : error ? (
								<Center h="100%">
									<Alert.Root status="error">
										<Alert.Indicator />
										<Alert.Description>{error}</Alert.Description>
									</Alert.Root>
								</Center>
							) : (
								cartItems.map((item: CartItem) => (
									<Flex
										key={item.comicId}
										boxShadow="0 4px 8px rgba(0,0,0,0.1)"
										rounded="md"
										overflow="hidden"
										p={4}
										alignItems="center"
										justifyContent="space-between"
										mb={4}
									>
										<Image
											src={item.image || "/path/to/default-image.jpg"}
											alt={item.title}
											maxW={{ base: "75px", md: "100px" }}
											objectFit="contain"
										/>
										<Box flex="1" ml={4}>
											<Text fontWeight="bold" fontSize="lg" lineClamp={1}>
												{item.title}
											</Text>
											<Text>Price: ${item.price.toFixed(2)} {item.currency}</Text>
											<Flex alignItems="center">
												<Button
													size="sm"
													onClick={() => handleStockChange(item.comicId, item.quantity - 1)}
													disabled={item.quantity <= 1}
												>
													-
												</Button>
												<Input
													size="sm"
													value={item.quantity}
													readOnly
													width="50px"
													mx={2}
													textAlign="center"
												/>
												<Button
													size="sm"
													onClick={() => handleStockChange(item.comicId, item.quantity + 1)}
													disabled={item.quantity >= item.stock}
												>
													+
												</Button>
											</Flex>
										</Box>
										<IconButton
											aria-label="Remove from cart"
											colorPalette="red"
											onClick={() => confirmRemoveFromCart(item.comicId)}
										>
											<Trash2 />
										</IconButton>
									</Flex>
								))
							)}
						</Drawer.Body>
						<Drawer.Footer>
							<Box width="100%" p={4}>
								<Flex justifyContent="space-between">
									<Text>Subtotal:</Text>
									<Text>${calculateTotalAmount().toFixed(2)}</Text>
								</Flex>
								<Flex justifyContent="space-between" mt={2} fontWeight="bold">
									<Text>Total:</Text>
									<Text>${calculateTotalAmount().toFixed(2)}</Text>
								</Flex>
								<Button mt={4} colorPalette="blue" width="100%" onClick={handleCheckout}>
									Go to Checkout
								</Button>
							</Box>
						</Drawer.Footer>
					</Drawer.Content>
				</Drawer.Positioner>
			</Drawer.Root>

			<Dialog.Root open={isDeleteDialogOpen} onOpenChange={(e) => { if (!e.open) setIsDeleteDialogOpen(false); }} role="alertdialog">
				<Portal>
					<Dialog.Backdrop />
					<Dialog.Positioner>
						<Dialog.Content>
							<Dialog.Header><Dialog.Title fontSize="lg" fontWeight="bold">Delete Comic</Dialog.Title></Dialog.Header>
							<Dialog.Body>
								Are you sure you want to delete this comic from your cart?
							</Dialog.Body>
							<Dialog.Footer>
								<Button onClick={() => setIsDeleteDialogOpen(false)}>
									Cancel
								</Button>
								<Button
									colorPalette="red"
									onClick={() => {
										if (selectedComicId) {
											handleRemoveFromCart(selectedComicId);
										}
										setIsDeleteDialogOpen(false);
									}}
									ml={3}
								>
									Delete
								</Button>
							</Dialog.Footer>
							<Dialog.CloseTrigger />
						</Dialog.Content>
					</Dialog.Positioner>
				</Portal>
			</Dialog.Root>

			{isCheckoutOpen && clientSecret && orderData && (
				<Drawer.Root open={isCheckoutOpen} onOpenChange={(e) => { if (!e.open) setIsCheckoutOpen(false); }} placement="end" size={{ base: "full", md: "md" }}>
					<Drawer.Backdrop />
					<Drawer.Positioner>
						<Drawer.Content>
							<Drawer.CloseTrigger asChild position="absolute" top="3" insetEnd="4">
								<CloseButton size="sm" />
							</Drawer.CloseTrigger>
							<Drawer.Header><Drawer.Title>Checkout</Drawer.Title></Drawer.Header>
							<Drawer.Body>
								<Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
									<CheckoutForm amount={totalAmount} orderId={orderData.orderId} />
								</Elements>
							</Drawer.Body>
						</Drawer.Content>
					</Drawer.Positioner>
				</Drawer.Root>
			)}
		</>
	);
};

export default CartDrawer;

