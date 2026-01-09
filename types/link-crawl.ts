type Og = {
  title: string | null;
  description: string | null;
  image: string | null;
  site_name: string | null;
  url: string | null;
  icon: string | null;
};
export type LinkCrawlResponse = {
  success: boolean;
  data: Og;
};
