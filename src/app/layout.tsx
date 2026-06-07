// app/layout.tsx
import { Inter, Libre_Franklin } from "next/font/google";
import { Metadata } from "next";
import ClientProviders from "@/components/client-providers";
import GlobalStyles from "@/components/global-styles";
// import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const libreFranklin = Libre_Franklin({ subsets: ["latin"] }); // Assuming you want this font selectable in the editor

export const metadata = {
	metadataBase: new URL("https://retro-pop-comics.com"), // Replace with your actual domain
	title: {
		default: "Retro-Pop Comics | Vintage & Modern Comic Book Marketplace",
		template: "%s | Retro-Pop Comics",
	},
	description:
		"Your premier destination for vintage and modern comic books. Browse, buy, and sell comics with AI-powered suggestions, extensive comic databases, and community features.",
	keywords: ["comics", "vintage comics", "comic books", "comic marketplace", "comic trading", "comic collecting"],
	authors: [{ name: "Retro-Pop Comics" }],
	creator: "Retro-Pop Comics",
	publisher: "Retro-Pop Comics",
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "https://retro-pop-comics.com",
		title: "Retro-Pop Comics | Vintage & Modern Comic Book Marketplace",
		description:
			"Your premier destination for vintage and modern comic books. Browse, buy, and sell comics with AI-powered suggestions.",
		siteName: "Retro-Pop Comics",
	},
	twitter: {
		card: "summary_large_image",
		title: "Retro-Pop Comics | Vintage & Modern Comic Book Marketplace",
		description: "Your premier destination for vintage and modern comic books.",
		creator: "@retroPopComics",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	verification: {
		google: "your-google-verification-code", // Add your Google Search Console verification code
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" data-bs-theme="dark" className={`${inter.className} ${libreFranklin.className}`} suppressHydrationWarning>
			<head>
				{/* <script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js" defer /> */}
			</head>
			<body suppressHydrationWarning>
				<GlobalStyles />
				<ClientProviders>{children}</ClientProviders>
			</body>
		</html>
	);
}
