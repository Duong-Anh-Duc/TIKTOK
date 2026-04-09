import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const CID = '7494019322380649496';
const SHOP_ID = process.env.TIKTOK_SHOP_ID || '';
const SHOP_REGION = process.env.TIKTOK_SHOP_REGION || 'VN';

async function main() {
  const { chromium } = await import('playwright');
  const cdpUrl = process.env.CHROME_CDP_URL || 'http://127.0.0.1:56439';
  const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 15000 });
  const ctx = browser.contexts()[0] || await browser.newContext();
  const page = await ctx.newPage();

  const url = `https://affiliate.tiktok.com/connection/creator/detail?cid=${CID}&shop_region=${SHOP_REGION}&shop_id=${SHOP_ID}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(5000);

  // Scroll xuống để load biểu đồ
  await page.evaluate('window.scrollBy(0, 800)');
  await page.waitForTimeout(5000);

  // Debug: dump relevant DOM text
  const debug = await page.evaluate(`
    (function() {
      var result = {};

      // 1. Tìm tất cả text có chứa GMV, Số món, categories
      var bodyText = document.body.innerText;

      // 2. Tìm section "Doanh số" 
      var sections = [];
      document.querySelectorAll('div').forEach(function(d) {
        var t = (d.innerText || '').trim();
        if (t.startsWith('Doanh số') && t.length < 2000) {
          sections.push(t.substring(0, 500));
        }
      });
      result.doanhSoSections = sections.slice(0, 3);

      // 3. Tìm "Danh mục" section
      var catSections = [];
      document.querySelectorAll('div, span').forEach(function(d) {
        var t = (d.textContent || '').trim();
        if (t === 'Danh mục' || t.startsWith('Danh mục')) {
          var parent = d.parentElement;
          if (parent) catSections.push(parent.innerText.substring(0, 300));
        }
      });
      result.catSections = catSections.slice(0, 3);

      // 4. GMV từ mỗi kênh bán hàng  
      var revSections = [];
      document.querySelectorAll('div').forEach(function(d) {
        var t = (d.innerText || '').trim();
        if (t.includes('GMV từ mỗi kênh') && t.length < 500) {
          revSections.push(t);
        }
      });
      result.revenueSections = revSections.slice(0, 2);

      // 5. Tìm tooltip Danh mục
      var tooltips = [];
      document.querySelectorAll('[title]').forEach(function(el) {
        var title = el.getAttribute('title');
        if (title && (title.includes('Trang phục') || title.includes('Chăm sóc') || title.includes('Đồ gia'))) {
          tooltips.push(title);
        }
      });
      result.catTooltips = tooltips;

      // 6. Tìm LIVE/Video percentages
      var liveVideoTexts = [];
      var allText = bodyText;
      var matches = allText.match(/(LIVE|Video)[\\s\\S]{0,20}[\\d,]+[.,]\\d+%/gi);
      if (matches) liveVideoTexts = matches;
      result.liveVideoTexts = liveVideoTexts;

      return result;
    })()
  `);

  console.log(JSON.stringify(debug, null, 2));

  await page.close();
  await browser.close();
}

main().catch(err => { console.error(err.message); process.exit(1); });
