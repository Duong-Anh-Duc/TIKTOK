export const SCRAPER = {
  shopId: '7496039374454229703',
  concurrentTabs: 3,
  maxCaptchaFails: 3,
} as const;

export const LIVE_VIEWER_MARKS: Record<number, string> = {
  0: '0', 25: '100', 50: '1K', 75: '10K', 100: '100K+',
};

export function sliderToValue(pos: number): number {
  if (pos <= 0) return 0;
  if (pos <= 25) return Math.round((pos / 25) * 100);
  if (pos <= 50) return Math.round(100 + ((pos - 25) / 25) * 900);
  if (pos <= 75) return Math.round(1000 + ((pos - 50) / 25) * 9000);
  return Math.round(10000 + ((pos - 75) / 25) * 90000);
}

export function valueToSlider(val: number): number {
  if (val <= 0) return 0;
  if (val <= 100) return (val / 100) * 25;
  if (val <= 1000) return 25 + ((val - 100) / 900) * 25;
  if (val <= 10000) return 50 + ((val - 1000) / 9000) * 25;
  return 75 + ((val - 10000) / 90000) * 25;
}
