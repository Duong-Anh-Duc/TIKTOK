/**
 * Test script: cào 1 creator cụ thể từ detail page
 * Usage: npx tsx test/test-scrape-creator.ts
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { GemLoginService } from '../src/modules/gemlogin/gemlogin.service';
import { scrapeContactInTab } from '../src/modules/scraper/helpers/scraper-contact';
import { saveXlsx } from '../src/modules/scraper/helpers/scraper-excel';

const CID = '7494019322380649496';

async function main() {
  console.log('--- Test Scrape Creator ---');
  console.log('GEMLOGIN_API_URL:', process.env.GEMLOGIN_API_URL || '(not set)');
  console.log('GEMLOGIN_PROFILE_ID:', process.env.GEMLOGIN_PROFILE_ID || '1');
  console.log('SHOP_ID:', process.env.TIKTOK_SHOP_ID || '(not set)');
  console.log('SHOP_REGION:', process.env.TIKTOK_SHOP_REGION || 'VN');

  // 1. Start GemLogin profile
  const profileId = process.env.GEMLOGIN_PROFILE_ID || '1';
  console.log(`\n[1] Starting GemLogin profile: ${profileId}...`);
  const gemResult = await GemLoginService.startProfile(profileId);
  console.log(`[1] GemLogin started. CDP: ${gemResult.cdpUrl}`);

  // 2. Connect to browser via CDP
  console.log('\n[2] Connecting to CDP...');
  const { chromium } = await import('playwright');
  const browser = await chromium.connectOverCDP(gemResult.cdpUrl, { timeout: 15000 });
  const ctx = browser.contexts()[0] || await browser.newContext();
  const page = await ctx.newPage();

  // 3. Scrape creator detail
  console.log('[3] Scraping creator detail: cid=' + CID);
  const result = await scrapeContactInTab(page, CID, (blocked) => {
    if (blocked) console.error('!! CAPTCHA BLOCKED !!');
  });

  if (!result) {
    console.error('[FAIL] scrapeContactInTab returned null');
    await page.close();
    await browser.close();
    process.exit(1);
  }

  console.log('\n=== RESULT ===');
  console.log('Bio:', result.bio || '(empty)');
  console.log('Phone:', result.phone || '(empty)');
  console.log('Zalo:', result.zalo || '(empty)');
  console.log('WhatsApp:', result.whatsapp || '(empty)');
  console.log('Email:', result.email || '(empty)');
  console.log('Followers:', result.detailFollowers || '(empty)');
  console.log('GMV:', result.detailGmv || '(empty)');
  console.log('Categories:', result.detailCategories || '(empty)');
  console.log('Items Sold:', result.detailItemsSold || '(empty)');
  console.log('Revenue Source:', result.revenueSource || '(empty)');

  // 4. Save to Excel
  const row = {
    username: 'chipxinh_video',
    nickname: 'chipxinh_video',
    bio: result.bio,
    followers: result.detailFollowers,
    gmv: result.detailGmv,
    categories: result.detailCategories,
    items_sold: result.detailItemsSold,
    content_type: result.revenueSource,
    phone: result.phone,
    zalo: result.zalo,
    whatsapp: result.whatsapp,
    email: result.email,
    tiktok: 'https://www.tiktok.com/@chipxinh_video',
    detailLink: 'https://affiliate.tiktok.com/connection/creator/detail?cid=' + CID + '&shop_region=VN&shop_id=7496312551686703552',
  };

  const outPath = saveXlsx([row], true);
  console.log('\n[4] Excel saved:', outPath);

  await page.close();
  await browser.close();
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
