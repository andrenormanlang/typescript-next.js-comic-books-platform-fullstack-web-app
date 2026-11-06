import React, { useCallback, useEffect, useRef, useState } from "react";
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
import Price from "@/components/comics-store/Price";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice } from "@/lib/currency";
import { formatCountdown, useCountdown } from "@/hooks/comics-sale/useCountdown";

interface PaymentSuccessDetail {
	userId: string;
}

interface OrderData {
	amount: number;
	currency: string;
	items: CartItem[];
	orderId: number;
	/** End of the 30-minute stock hold (server time). */
	expiresAt: string;
	serverNow: string;
}

const WARN_MS = 5 * 60 * 1000;

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
	const [clientSecret, setClientSecret] = useState("");
	const [orderData, setOrderData] = useState<OrderData | null>(null);
	const [isPaying, setIsPaying] = useState(false);
	const [isStartingCheckout, setIsStartingCheckout] = useState(false);
	const { currency: visitorCurrency, convert, ratesDate } = useCurrency();
	const remainingMs = useCountdown(isCheckoutOpen ? orderData?.expiresAt : null, orderData?.serverNow);
	const expired = remainingMs !== null && remainingMs <= 0;
	const closingRef = useRef(false);

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

	// Display only: the total in the visitor's currency, estimated with the
	// latest rates. The charged amount is computed by reserve_order() at checkout.
	const estimateTotal = (): { amount: number; currency: string; estimated: boolean } | null => {
		if (!visitorCurrency) return null;
		let amount = 0;
		let estimated = false;
		for (const item of cartItems) {
			const unit = convert(item.price, item.currency);
			if (unit === null) return null;
			if ((item.currency || "").toUpperCase() !== visitorCurrency) estimated = true;
			amount += unit * item.quantity;
		}
		return { amount, currency: visitorCurrency, estimated };
	};

	// Fallback when rates are missing: one subtotal per listing currency.
	const totalsByCurrency = () => {
		const totals = new Map<string, number>();
		for (const item of cartItems) {
			const code = (item.currency || "USD").toUpperCase();
			totals.set(code, (totals.get(code) ?? 0) + item.price * item.quantity);
		}
		return [...totals.entries()];
	};

	const estimate = estimateTotal();

	const handleCheckout = async () => {
		if (!user || isStartingCheckout) return;
		setIsStartingCheckout(true);

		try {
			// Only ids, quantities and the currency are sent; the server prices and
			// converts the order and reserves the stock for 30 minutes.
			const response = await fetch("/api/create-order", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					items: cartItems.map((item) => ({ comicId: item.comicId, quantity: item.quantity })),
					...(visitorCurrency ? { currency: visitorCurrency } : {}),
				}),
			});

			const data = await response.json();

			if (!response.ok || data.error) {
				toaster.create({
					title: response.status === 409 ? "Sold out" : "Payment Error",
					description: data.error,
					type: "error",
					duration: 7000,
				});
				if (response.status === 409) {
					dispatch(fetchCart({ userId: user.id }));
				}
				return;
			}

			if (data.notice) {
				toaster.create({ title: "Heads up", description: data.notice, type: "info", duration: 7000 });
			}

			setClientSecret(data.clientSecret);
			setOrderData({
				amount: data.amount,
				currency: data.currency,
				items: cartItems,
				orderId: data.orderId,
				expiresAt: data.expiresAt,
				serverNow: data.serverNow,
			});
			closingRef.current = false;
			setIsCheckoutOpen(true);
		} catch {
			toaster.create({
				title: "Payment Error",
				description: "Could not start checkout. Please try again.",
				type: "error",
				duration: 5000,
			});
		} finally {
			setIsStartingCheckout(false);
		}
	};

	// Closes checkout and gives the reserved comics back straight away, instead
	// of waiting for checkout-maintenance. The cart itself is unchanged.
	const closeCheckout = useCallback(
		(reason: "closed" | "expired") => {
			if (closingRef.current) return;
			closingRef.current = true;
			const orderId = orderData?.orderId;
			setIsCheckoutOpen(false);
			if (orderId) {
				fetch("/api/cancel-order", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ orderId }),
				}).catch(() => undefined); // checkout-maintenance releases it anyway
			}
			if (reason === "expired") {
				toaster.create({
					title: "Reservation expired",
					description:
						"Your 30 minutes ran out and the comics were released. They are still in your cart: press Go to Checkout to reserve them again.",
					type: "warning",
					duration: 10000,
				});
			}
		},
		[orderData?.orderId]
	);

	// Timer reached 0: close checkout, unless a payment is in progress. Then the
	// server decides: the webhook settles it or checkout-maintenance expires it.
	useEffect(() => {
		if (isCheckoutOpen && expired && !isPaying) closeCheckout("expired");
	}, [isCheckoutOpen, expired, isPaying, closeCheckout]);


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
											<Flex gap={1} alignItems="baseline" wrap="wrap">
												<Text>Price:</Text>
												<Price amount={item.price} currency={item.currency} layout="inline" />
											</Flex>
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
								{estimate ? (
									<>
										<Flex justifyContent="space-between" fontWeight="bold">
											<Text>Total:</Text>
											<Text>
												{estimate.estimated ? "≈ " : ""}
												{formatPrice(estimate.amount, estimate.currency)}
											</Text>
										</Flex>
										{estimate.estimated && (
											<Text fontSize="xs" opacity={0.7} mt={1}>
												Converted to {estimate.currency}
												{ratesDate ? ` at European Central Bank rates of ${ratesDate}` : ""}. The exact
												amount is fixed when you go to checkout.
											</Text>
										)}
									</>
								) : (
									totalsByCurrency().map(([code, amount]) => (
										<Flex key={code} justifyContent="space-between" fontWeight="bold">
											<Text>Total ({code}):</Text>
											<Text>{formatPrice(amount, code)}</Text>
										</Flex>
									))
								)}
								<Button
									mt={4}
									colorPalette="blue"
									width="100%"
									onClick={handleCheckout}
									loading={isStartingCheckout}
									disabled={cartItems.length === 0}
								>
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
				<Drawer.Root
					open={isCheckoutOpen}
					// Never close (and release the hold) mid-payment, e.g. on a click
					// inside Stripe's 3-D Secure pop-up.
					onOpenChange={(e) => { if (!e.open && !isPaying) closeCheckout("closed"); }}
					closeOnInteractOutside={!isPaying}
					closeOnEscape={!isPaying}
					placement="end"
					size={{ base: "full", md: "md" }}
				>
					<Drawer.Backdrop />
					<Drawer.Positioner>
						<Drawer.Content>
							<Drawer.CloseTrigger asChild position="absolute" top="3" insetEnd="4">
								<CloseButton size="sm" />
							</Drawer.CloseTrigger>
							<Drawer.Header><Drawer.Title>Checkout</Drawer.Title></Drawer.Header>
							<Drawer.Body>
								{remainingMs !== null && (
									<Alert.Root
										status={remainingMs < WARN_MS ? "warning" : "info"}
										mb={4}
										role="timer"
										aria-live={remainingMs < WARN_MS ? "polite" : "off"}
									>
										<Alert.Indicator />
										<Alert.Description>
											{expired
												? "Your reservation has expired."
												: remainingMs < WARN_MS
													? `Your reservation ends in ${formatCountdown(remainingMs)}`
													: `Comics reserved for you: ${formatCountdown(remainingMs)}`}
										</Alert.Description>
									</Alert.Root>
								)}
								<Flex justifyContent="space-between" fontWeight="bold" mb={1}>
									<Text>To pay:</Text>
									<Text>{formatPrice(orderData.amount, orderData.currency)}</Text>
								</Flex>
								{orderData.items.some((i) => (i.currency || "").toUpperCase() !== orderData.currency) && (
									<Text fontSize="xs" opacity={0.7} mb={4}>
										Prices converted to {orderData.currency} at European Central Bank rates. This amount is
										fixed while your reservation lasts.
									</Text>
								)}
								<Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
									<CheckoutForm
										amount={orderData.amount}
										currency={orderData.currency}
										orderId={orderData.orderId}
										expired={expired}
										onSubmittingChange={setIsPaying}
									/>
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

