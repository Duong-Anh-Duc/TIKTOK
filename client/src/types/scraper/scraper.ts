export interface Creator {
  id: string;
  creator_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  score: string | null;
  categories: string[];
  followers: string | null;
  followers_count: number | null;
  gmv: string | null;
  items_sold: number | null;
  avg_views: string | null;
  engagement_rate: string | null;
  gpm: string | null;
  gmv_per_customer: string | null;
  phone: string | null;
  email: string | null;
  tiktok_url: string | null;
  shop_id: string | null;
  scraped_at: string;
}

export interface ScrapeJob {
  id: string;
  status: string;
  total: number;
  scraped: number;
  failed: number;
  error: string | null;
  message?: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface Category {
  label: string;
  value: string;
  children?: Category[];
}
