import BlogPostDetailServer from "../_components/BlogPostDetail/BlogPostDetail.server";


export default function BlogPostPage(props: { params: Promise<{ id: string }> }) {
  return <BlogPostDetailServer {...props} />;
}
