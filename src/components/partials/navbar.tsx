"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useColorModeValue, useColorMode } from "@/components/ui/color-mode";
import {
	Box,
	Button,
	Flex,
	IconButton,
	Link,
	useDisclosure,
	Menu,
	Stack,
	Badge,
	Icon,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { Menu as HamburgerIcon, X as CloseIcon, Moon as MoonIcon, Sun as SunIcon, ChevronDown as ChevronDownIcon, Plus as AddIcon } from "lucide-react";
import { VscAccount, VscSignOut } from "react-icons/vsc";
import ShoppingCartButton from "@/helpers/ShoppingCartButton";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import RetroPopLogo from "@/helpers/RetroPopLogo";
import { MenuType, SubmenuType } from "@/types/navbar/nav.types";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setAvatarUrl } from "@/store/avatarSlice";
import { fetchCart } from "@/store/cartSlice";
import AvatarNav from "../../helpers/AvatarNav";
import CartDrawer from "@/app/comics-store/cart/CartDrawer";

interface MobileMenuItemProps {
	item: MenuType | SubmenuType;
	index: number | string;
	btnStyle: Record<string, any>;
	marvelBtnStyle: Record<string, any>;
	onNavigate: () => void;
}

const MobileMenuItem: React.FC<MobileMenuItemProps> = ({ item, index, btnStyle, marvelBtnStyle, onNavigate }) => {
	const [isOpen, setIsOpen] = useState(false);
	const style = item.name === "MARVEL" ? marvelBtnStyle : btnStyle;

	if (!item.submenu) {
		return (
			<Button asChild {...btnStyle}>
				<Link href={(item as SubmenuType).href ?? "#"} onClick={onNavigate}>
					{item.name}
				</Link>
			</Button>
		);
	}

	return (
		<Box width="100%" display="flex" flexDirection="column" alignItems="center" gap={2}>
			<Button {...style} onClick={() => setIsOpen((o) => !o)}>
				{item.name}
				<ChevronDownIcon
					size={16}
					style={{
						marginLeft: "0.4rem",
						transform: isOpen ? "rotate(180deg)" : "none",
						transition: "transform 0.2s",
					}}
				/>
			</Button>
			{isOpen && (
				<Box width="90%" display="flex" flexDirection="column" alignItems="center" gap={2}>
					{item.submenu.map((subItem, subIndex) => (
						<MobileMenuItem
							key={`${index}-${subIndex}`}
							item={subItem}
							index={`${index}-${subIndex}`}
							btnStyle={btnStyle}
							marvelBtnStyle={marvelBtnStyle}
							onNavigate={onNavigate}
						/>
					))}
				</Box>
			)}
		</Box>
	);
};

const Navbar = () => {
	const supabase = createClient();
	const { open: isOpen, onToggle, onClose } = useDisclosure();
	const { open: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
	const { colorMode, toggleColorMode } = useColorMode();
	const containerRef = React.useRef(null);
	const [user, setUser] = useState<User | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
	const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
	const cart = useSelector((state: RootState) => state.cart.items);
	const dispatch = useDispatch<AppDispatch>();
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	// Move color mode values to component level
	const profileIconColor = useColorModeValue("blue.500", "blue.200");
	const signoutIconColor = useColorModeValue("red.500", "red.200");
	const menuBg = useColorModeValue("white", "gray.800");
	const menuBgTransparent = useColorModeValue("rgba(255, 255, 255, 0.95)", "rgba(26, 32, 44, 0.95)");
	const menuItemTextColor = useColorModeValue("gray.700", "whiteAlpha.900");
	const menuItemHoverBg = useColorModeValue("blue.50", "whiteAlpha.100");
	const menuItemHoverColor = useColorModeValue("blue.600", "white");
	const menuItemFocusBg = useColorModeValue("blue.100", "whiteAlpha.200");
	const menuItemFocusColor = useColorModeValue("blue.700", "white");
	const menuBorderColor = useColorModeValue("gray.200", "whiteAlpha.300");

	const fetchUserProfile = useCallback(
		async (userId: string) => {
			try {
				const { data, error } = await supabase
					.from("profiles")
					.select("avatar_url, is_admin")
					.eq("id", userId)
					.single();
				if (error) {
					throw error;
				}
				if (data) {
					if (data.avatar_url) {
						dispatch(setAvatarUrl(data.avatar_url));
					}
					if (data.is_admin) {
						setIsAdmin(true);
					}
				} else {
					console.log("No profile data found");
				}
			} catch (error) {
				console.error("Error fetching profile data:", error);
			}
		},
		[supabase, dispatch],
	);

	useEffect(() => {
		const fetchUser = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			setUser(session?.user || null);
			if (session?.user) {
				fetchUserProfile(session.user.id);
				dispatch(fetchCart({ userId: session.user.id }));
			}
		};

		fetchUser();
	}, [supabase, fetchUserProfile, dispatch]);

	useEffect(() => {
		if (!user) {
			setIsAdmin(false);
		}
	}, [user]);

	// Add useEffect for handling body scroll
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	const handleSignOut = async () => {
		setLoading(true);
		try {
			await supabase.auth.signOut();
			setUser(null);
			router.push("/");
			router.refresh();
			toaster.create({
				title: "Signed out successfully",
				description: "You have been signed out.",
				type: "success",
				duration: 5000,
			});
		} catch (error) {
			toaster.create({
				title: "Sign out failed",
				description: "Failed to sign out. Please try again.",
				type: "error",
				duration: 5000,
			});
			console.error("Sign out error:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleOpenMainMenu = () => {
		setIsMainMenuOpen(true);
		onToggle();
	};

	const handleCloseMainMenu = () => {
		setIsMainMenuOpen(false);
		onToggle();
	};

	const handleToggleAvatarMenu = () => {
		setIsAvatarMenuOpen(!isAvatarMenuOpen);
	};

	const variants = {
		open: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: {
				type: "spring",
				stiffness: 300,
				damping: 30,
				staggerChildren: 0.1,
				when: "beforeChildren",
			},
		},
		closed: {
			opacity: 0,
			y: "-10%",
			scale: 0.95,
			transition: {
				type: "spring",
				stiffness: 300,
				damping: 30,
				staggerChildren: 0.05,
				staggerDirection: -1,
				when: "afterChildren",
			},
		},
	};

	const itemVariants = {
		open: {
			opacity: 1,
			y: 0,
			transition: {
				type: "spring",
				stiffness: 300,
				damping: 30,
			},
		},
		closed: {
			opacity: 0,
			y: 20,
			transition: {
				type: "spring",
				stiffness: 300,
				damping: 30,
			},
		},
	};

	const buttonStyle = {
		width: "100%",
		maxWidth: "220px",
		fontWeight: "700",
		fontFamily: "Bangers",
		fontSize: { base: "1rem", md: "1.3rem" },
		letterSpacing: "0.2rem",
		color: "white",
		justifyContent: "center",
		alignItems: "center",
		display: "flex",
		height: "2.5rem",
		my: "0.5rem",
		bg: "blue.500",
		borderRadius: "md",
		outline: "none",
		transition: "all 0.2s ease-in-out",
		_hover: {
			bg: "blue.600",
			transform: "scale(1.05)",
		},
		_active: {
			bg: "blue.700",
		},
		_focus: {
			boxShadow: "outline",
		},
	};


	const newReleaseButtonStyle = {
		...buttonStyle,
		bg: "green.500",
		color: "red.500",
		_hover: {
			bg: "green.600",
			color: "red.400",
			transform: "scale(1.05)",
			transition: "all 0.2s",
		},
		_active: {
			bg: "green.700",
			color: "red.600",
		},
	};

	const aboutButtonStyle = {
		...buttonStyle,
		bg: "purple.500",
		_hover: {
			bg: "purple.600",
			transform: "scale(1.05)",
			transition: "all 0.2s",
		},
		_active: {
			bg: "purple.700",
		},
	};


	const avatarMenuListStyle = {
		bg: menuBg,
		border: "1px solid",
		borderColor: menuBorderColor,
		borderRadius: "xl",
		boxShadow: "lg",
		minW: "200px",
		p: "3",
		mt: "4",
		zIndex: "popover",
		backdropFilter: "blur(8px)",
		backgroundColor: menuBgTransparent,
		_dark: {
			bg: "gray.800",
			borderColor: "whiteAlpha.300",
		},
	};

	const marvelButtonStyle = {
		...buttonStyle,
		fontWeight: "900",
		textTransform: "uppercase",
		bg: "red.500",
		color: "white",
		padding: "1rem",
		letterSpacing: "-0.15rem",
	};

	const menuItemStyle = {
		p: "3",
		m: "1",
		borderRadius: "md",
		transition: "all 0.2s",
		bg: "transparent",
		color: menuItemTextColor,
		_hover: {
			bg: menuItemHoverBg,
			color: menuItemHoverColor,
			transform: "translateX(4px)",
		},
		_focus: {
			bg: menuItemFocusBg,
			color: menuItemFocusColor,
			boxShadow: "outline",
		},
		_active: {
			bg: menuItemFocusBg,
			color: menuItemFocusColor,
		},
		display: "flex",
		alignItems: "center",
		gap: "3",
		fontSize: "0.95rem",
		fontWeight: "500",
	};

	const menuItems: MenuType[] = [
		{
			name: "Search",
			submenu: [
				{
					name: "Comic Vine",
					submenu: [
						{ name: "Issues", href: "/search/comic-vine/issues" },
						{ name: "Characters", href: "/search/comic-vine/characters" },
						{ name: "Publishers", href: "/search/comic-vine/publishers" },
					],
				},
				{
					name: "Characters",
					submenu: [
						{ name: "Superheros API", href: "/search/superheros/superhero-api" },
						{ name: "Superheros List", href: "/search/superheros/superheros-list" },
					],
				},
				{
					name: "Quadrinhos Brasil",
					href: "/search/guia-search",
				},
				{
					name: "getcomics.org",
					submenu: [{ name: "Get Some!", href: "/search/comicbooks-api" }],
				},
				{
					name: "MARVEL",
					submenu: [
						{ name: "Comics", href: "/search/marvel/marvel-comics" },
						// { name: "Characters", href: "/search/marvel/marvel-characters" },
						{ name: "Creators", href: "/search/marvel/marvel-creators" },
						// { name: "Events", href: "/search/marvel/marvel-events" },
						{ name: "Series", href: "/search/marvel/marvel-series" },
						// { name: "Stories", href: "/search/marvel/marvel-stories" },
					],
				},
				{
					name: "Metron Cloud",
					submenu: [{ name: "Issues", href: "/search/metron/metron-issues" }],
				},
			],
		},
	];

	if (isAdmin) {
		menuItems.push({
			name: "Admin",
			submenu: [
				{
					name: "Admin Tables",
					href: "/comics-store/admin-tables",
				},
			],
		});
	}



	const renderAvatarItem = (name: string, href?: string, onClick?: () => void) => (
		<Menu.Item key={name} value={name.toLowerCase().replace(/\s+/g, "-")} {...menuItemStyle} onClick={onClick} asChild>
			<Link href={href ?? "#"} style={{ textDecoration: "none", width: "100%" }}>
				<Icon
					as={name === "Profile" ? VscAccount : VscSignOut}
					fontSize="1.2rem"
					color={name === "Profile" ? profileIconColor : signoutIconColor}
				/>
				{name}
			</Link>
		</Menu.Item>
	);

	return (
		<Box
			as="nav"
			position="fixed"
			top="0"
			width="100%"
			zIndex={10}
			bg="gray.800"
			boxShadow="0 2px 4px rgba(0,0,0,0.5)"
		>
			<Flex
				justify="space-between"
				wrap="wrap"
				padding="1.5rem"
				color="white"
				height="100%"
				alignItems="center"
				px={{ base: "1rem", md: "4rem", lg: "8rem" }}
			>
				<Flex align="center" mr={4}>
					<Link href="/">
						<RetroPopLogo size={{ base: "60px", md: "80px" }} />
					</Link>
				</Flex>

				<Flex align="center">
					{user && (
						<Box position="relative" mr={3}>
							<IconButton
								aria-label="Cart"
								
								onClick={onDrawerOpen}
								size={{ base: "sm", md: "md" }}
								variant="outline"
								colorPalette="blue"
								_hover={{ bg: "blue.500", color: "white", borderColor: "blue.500" }}
								_active={{ bg: "blue.600", color: "white", borderColor: "blue.600" }}
								_focus={{ boxShadow: "outline" }}
							><ShoppingCartButton /></IconButton>
							<Badge
								position="absolute"
								top="0"
								right="2.5"
								transform="translate(50%, -50%)"
								borderRadius="full"
								px="2"
								py="1"
								bg="red.600"
								color="white"
								fontSize={{ base: "0.6em", md: "0.75em" }}
								fontWeight="bold"
							>
								{cart.length}
							</Badge>
						</Box>
					)}

					{!isMainMenuOpen && (
						<IconButton
							onClick={handleOpenMainMenu}
							aria-label="Open menu"
							variant="ghost"
							color="white"
							_hover={{ bg: "whiteAlpha.200" }}
							mr={2}
						>
							<HamburgerIcon size={20} />
						</IconButton>
					)}

					{user && (
						<Flex align="center" ml={4}>
							<Menu.Root
								open={isAvatarMenuOpen}
								onOpenChange={(e) => { if (e.open !== isAvatarMenuOpen) handleToggleAvatarMenu(); }}
								positioning={{ placement: "bottom-end" }}
							>
								<Menu.Trigger asChild>
									<Box
										display="flex"
										alignItems="center"
										cursor="pointer"
										transition="all 0.2s"
										_hover={{ transform: "scale(1.05)" }}
										_active={{ transform: "scale(0.95)" }}
									>
										<AvatarNav uid={user.id} size={{ base: 12, md: 14 }} />
									</Box>
								</Menu.Trigger>
								<Menu.Positioner>
									<Menu.Content {...avatarMenuListStyle}>
										{renderAvatarItem("Profile", "/auth/account")}
										{renderAvatarItem("Sign Out", undefined, handleSignOut)}
									</Menu.Content>
								</Menu.Positioner>
							</Menu.Root>
						</Flex>
					)}

					<IconButton
						aria-label="Toggle theme"
						onClick={toggleColorMode}
						ml={3}
						size={{ base: "sm", md: "md" }}>{colorMode === "dark" ? <SunIcon /> : <MoonIcon />}</IconButton>
				</Flex>
			</Flex>

			{/* Mobile menu */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						ref={containerRef}
						variants={variants}
						initial="closed"
						animate="open"
						exit="closed"
						style={{
							position: "fixed",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							zIndex: 1000,
							backgroundColor: "rgba(0, 0, 0, 0.95)",
							backdropFilter: "blur(10px)",
							overflow: "auto",
						}}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ type: "spring", stiffness: 300, damping: 30 }}
						>
							<IconButton
								onClick={handleCloseMainMenu}
								aria-label="Close menu"
								position="absolute"
								top="1rem"
								right="1rem"
								zIndex="tooltip"
								bg="transparent"
								_hover={{ bg: "whiteAlpha.200" }}
								transition="all 0.2s"><CloseIcon size={5} /></IconButton>
						</motion.div>
						<Stack gap={4} align="center" justify="center" pt="5rem" width="100%" px={4}>
							{!user && (
								<>
									<motion.div
										variants={itemVariants}
										style={{ width: "100%", display: "flex", justifyContent: "center" }}
									>
										<Button asChild {...buttonStyle}>
											<Link href="/auth/login">Login</Link>
										</Button>
									</motion.div>
									<motion.div
										variants={itemVariants}
										style={{ width: "100%", display: "flex", justifyContent: "center" }}
									>
										<Button asChild {...buttonStyle}>
											<Link href="/auth/signup">Sign Up</Link>
										</Button>
									</motion.div>
								</>
							)}
							<motion.div
								variants={itemVariants}
								style={{ width: "100%", display: "flex", justifyContent: "center" }}
							>
								<Button asChild {...aboutButtonStyle}>
									<Link href="/about">About</Link>
								</Button>
							</motion.div>
							<motion.div
								variants={itemVariants}
								style={{ width: "100%", display: "flex", justifyContent: "center" }}
							>
								<Button
									asChild
									{...buttonStyle}
									bg="yellow.500"
									color="purple.500"
								>
									<Link href="/comic-suggestion/form">GET AI COMICS TIPS!</Link>
								</Button>
							</motion.div>
							<motion.div
								variants={itemVariants}
								style={{ width: "100%", display: "flex", justifyContent: "center" }}
							>
								<Button asChild {...newReleaseButtonStyle}>
									<Link href="/releases">NEW RELEASES!</Link>
								</Button>
							</motion.div>
							{user && (
								<motion.div
									variants={itemVariants}
									style={{ width: "100%", display: "flex", justifyContent: "center" }}
								>
									<Button asChild {...buttonStyle}>
										<Link href="/comics-store/sell">Tip Us!</Link>
									</Button>
								</motion.div>
							)}
							<motion.div
								variants={itemVariants}
								style={{ width: "100%", display: "flex", justifyContent: "center" }}
							>
								<Button asChild {...buttonStyle}>
									<Link href="/blog">Blog</Link>
								</Button>
							</motion.div>
							{menuItems.map((item, index) => (
								<motion.div
									key={index}
									variants={itemVariants}
									style={{ width: "100%", display: "flex", justifyContent: "center" }}
								>
									{item.submenu ? (
										<MobileMenuItem
											item={item}
											index={index}
											btnStyle={buttonStyle}
											marvelBtnStyle={marvelButtonStyle}
											onNavigate={handleCloseMainMenu}
										/>
									) : null}
								</motion.div>
							))}
							<motion.div
								variants={itemVariants}
								style={{ width: "100%", display: "flex", justifyContent: "center" }}
							>
								<Button asChild {...buttonStyle}>
									<Link href="/forums">Forums</Link>
								</Button>
							</motion.div>
						</Stack>
					</motion.div>
				)}
			</AnimatePresence>
			<CartDrawer isOpen={isDrawerOpen} onClose={onDrawerClose} />
		</Box>
	);
};

export default Navbar;
