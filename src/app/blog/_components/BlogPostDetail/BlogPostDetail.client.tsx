"use client";

// BlogPostDetail.client.tsx
import React from "react";
import { useRouter } from "next/navigation";
import { Container, Button, Box, Heading, Text, Center } from "@chakra-ui/react";
import { useColorMode } from "@/components/ui/color-mode";
import { BlogPost } from "@/types/blog/blog.type";

interface BlogPostDetailClientProps {
	post: BlogPost;
}

const BlogPostDetailClient: React.FC<BlogPostDetailClientProps> = ({ post }) => {
	const router = useRouter();
	const { colorMode } = useColorMode();
	const textColor = colorMode === "dark" ? "white" : "black";

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const options: Intl.DateTimeFormatOptions = {
			month: "long",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		};
		return date.toLocaleDateString("en-US", options).replace(",", "th,"); // This replace might be specific to English ordinal dates (e.g., 4th, 21st)
	};

	return (
		<Container maxW="container.md" py={8}>
			<Button mt={4} mb={4} onClick={() => router.back()}>
				Back
			</Button>
			<Box p={4} shadow="md" borderWidth="1px" color={textColor} className="post-content">
				<Heading as="h1" fontFamily="Bangers, sans-serif" fontWeight="normal">
					{post.title}
				</Heading>
				<Text fontSize="sm" color="gray.500" mb={4}>
					{formatDate(post.created_at)}
				</Text>
				{/* This Box wraps the rendered HTML and has the class 'blog-content' */}
				<Box
					mt={4}
					className="blog-content" // <-- Container class
					style={{ whiteSpace: "pre-wrap" }} // Consider removing whiteSpace: "pre-wrap" if content is pure HTML
					dangerouslySetInnerHTML={{ __html: post.content }}
				/>
			</Box>

			{/* This style block contains the CSS rules for spacing and link emphasis */}
			<style jsx global>{`
				/* Styles for inherited color/background within post-content */
				.post-content * {
					color: inherit !important;
					background-color: transparent !important;
				}

				/* General styles for the blog content container */
				.blog-content {
					font-family: inherit;
					line-height: 1.6;
					white-space: pre-wrap; /* Consider removing this */
				}

				/* Paragraph spacing styles */
				.blog-content p {
					margin-top: 0;
					margin-bottom: 1.5em; /* <-- This creates space below paragraphs */
					line-height: 1.6;
					white-space: pre-wrap; /* Consider removing this */
				}

				/* Remove space after the last paragraph */
				.blog-content p:last-child {
					margin-bottom: 0;
				}

				/* Heading spacing styles (already present) */
				.blog-content h1 {
					font-size: 2em;
					margin-top: 1.5em;
					margin-bottom: 0.8em;
				}
				.blog-content h2 {
					font-size: 1.5em;
					margin-top: 1.5em;
					margin-bottom: 0.7em;
				}
				.blog-content h3 {
					font-size: 1.17em;
					margin-top: 1.4em;
					margin-bottom: 0.6em;
				}
				.blog-content h4 {
					font-size: 1em;
					margin-top: 1.3em;
					margin-bottom: 0.5em;
				}
				.blog-content h5 {
					font-size: 0.83em;
					margin-top: 1.2em;
					margin-bottom: 0.4em;
				}
				.blog-content h6 {
					font-size: 0.75em;
					margin-top: 1.1em;
					margin-bottom: 0.3em;
				}

				/* List styles (already present) */
				.blog-content ul,
				.blog-content ol {
					margin-top: 1em;
					margin-bottom: 1em;
					padding-left: 2em;
				}

				.blog-content li {
					margin-bottom: 0.5em;
				}

				/* Blockquote styles (already present) */
				.blog-content blockquote {
					border-left: 4px solid #ccc;
					margin: 1.5em 0;
					padding-left: 1em;
					font-style: italic;
					color: #a0a0a0;
				}

				/* Code block styles (already present) */
				.blog-content pre {
					background-color: #f4f4f4 !important;
					border-radius: 4px;
					padding: 1em;
					overflow-x: auto;
					font-family: monospace;
					margin: 1em 0;
				}

				/* Inline code styles (already present) */
				.blog-content code {
					font-family: monospace;
					background-color: #e0e0e0 !important;
					padding: 0.2em 0.4em;
					border-radius: 4px;
				}

				/* Image styles (already present) */
				.blog-content img {
					max-width: 100%;
					height: auto;
					display: block;
					margin: 1em auto;
				}

				/* Link emphasis styles */
				.blog-content a,
				.blog-content .ProseMirror-link { /* <-- Target links */
					color: #63b3ed !important; /* <-- Emphasized color */
					text-decoration: underline; /* <-- Underline */
					font-weight: bold; /* <-- Bold text */
					cursor: pointer;
				}

				/* Link hover styles */
				.blog-content a:hover,
				.blog-content .ProseMirror-link:hover {
					text-decoration: none;
					color: #90cdf4 !important;
				}
			`}</style>
		</Container>
	);
};

export default BlogPostDetailClient;
