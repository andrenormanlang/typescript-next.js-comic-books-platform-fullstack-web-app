export type AiListingReview = {
	cover_matches_title: boolean;
	quality_flags: string[];
	suggested_description: string | null;
	confidence: number;
	model?: string;
};

export type Comic = {
	id: string;
	user_id: string;
	is_approved: boolean;
	created_at: string;
	updated_at: string;
	image: string;
	title: string;
	genre: string;
	release_date: string;
	pages: number;
	publisher: string;
	main_artist: string;
	main_writer: string;
	description: string;
	currency: string;
	price: number;
	stock: number;
	ai_review?: AiListingReview | null;
	ai_reviewed_at?: string | null;
	profiles: {
		username: string;
		email: string;
	};
};

export type WishlistItem = {
	id: string;
	comic_id: string;
	created_at: string;
	comic: Pick<
		Comic,
		"id" | "title" | "image" | "price" | "currency" | "stock" | "publisher" | "release_date" | "is_approved"
	> | null;
};

export type CartItem = {
	comicId: string;
	quantity: number;
	title: string;
	image: string;
	price: number;
	currency: string;
	stock: number;
  };

