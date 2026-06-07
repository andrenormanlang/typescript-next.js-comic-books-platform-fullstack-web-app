// BlogPostDetail.server.tsx
import { createClient } from "@/utils/supabase/client";
import { BlogPost } from "@/types/blog/blog.type";
import BlogPostDetailClient from "./BlogPostDetail.client";

interface Props {
	params: Promise<{ id: string }>;
}

export default async function BlogPostDetailServer({ params }: Props) {
	const supabase = createClient();
	const { id } = await params;

	// Fetch the blog post from Supabase on the server
	const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).single();

	if (error || !data) {
		// Handle error or not found state appropriately.
		return <div>Error: {error?.message || "Post not found"}</div>;
	}

	const post = data as BlogPost;

	// Pass the fetched data to a client component
	return <BlogPostDetailClient post={post} />;
}
