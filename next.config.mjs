/** @type {import('next').NextConfig} */
const nextConfig = {
	// experimental: {
	// 	missingSuspenseWithCSRBailout: false,
	// },
	images: {
		remotePatterns: [
			// {
			// 	protocol: "https",
			// 	hostname: "okepievzdelqzjwhsueu.supabase.co",
			// 	pathname: "/storage/v1/object/sign/avatars/**",
			// },
			{
				protocol: "https",
				hostname: "www.superherodb.com",
				pathname: "/**",
			},
		],
	},
	reactStrictMode: true,
	// Add experimental features for better API route handling
	experimental: {
		// Increase function execution time (requires Vercel Pro or compatible platform)
		serverActions: {
			bodySizeLimit: "2mb",
		},
	},
};

export default nextConfig;
