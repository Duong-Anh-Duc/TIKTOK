export interface ScrapeSchedule {
  id: string;
  name: string;
  cron_expr: string;
  is_enabled: boolean;
  max_creators: number;
  categories: string[][];
  content_type: string;
  gmv: string[];
  items_sold: string[];
  live_viewer_min: number;
  last_run_at: string | null;
  last_job_id: string | null;
  created_at: string;
}
