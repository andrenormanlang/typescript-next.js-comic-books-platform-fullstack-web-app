// app/blog/page.tsx
import { createClient } from "@/utils/supabase/server";
import { BlogPost } from "@/types/blog/blog.type";
import BlogPostListClient from "./_components/BlogPostList/BlogPostList.client";

// (Optional) Decide how Next.js should revalidate or cache this page
export const revalidate = 0; // or 'force-cache', etc.

export default async function BlogPage() {
  const supabase = await createClient();

  // Fetch posts on the server
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    // Return some fallback UI or error
    return <div>Error fetching blog posts: {error?.message}</div>;
  }

  // Pass the fetched posts to the client component
  return <BlogPostListClient initialPosts={data as BlogPost[]} />;
}
