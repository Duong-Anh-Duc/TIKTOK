/**
 * Test script: Cào 1 creator cụ thể để debug
 * Usage: npx tsx test/scrape-one.ts [URL hoặc CID]
 */
import 'dotenv/config';
import { chromium } from 'playwright';
import { scrapeContactInTab } from '../src/modules/scraper/helpers/scraper-contact';
import { solveCaptchaIfPresent, detectCaptcha } from '../src/utils/captcha-solver';
import { autoLoginIfNeeded } from '../src/modules/scraper/helpers/scraper-auth';

const SHOP_REGION = process.env.TIKTOK_SHOP_REGION || 'VN';
const SHOP_ID = process.env.TIKTOK_SHOP_ID || '';

// Lấy CID từ argument hoặc dùng default
const arg = process.argv[2] || '7495662347024238847';
const cid = arg.includes('cid=') ? new URL(arg).searchParams.get('cid')! : arg;
const url = `https://affiliate.tiktok.com/connection/creator/detail?cid=${cid}&shop_region=${SHOP_REGION}&shop_id=${SHOP_ID}`;

console.log('═'.repeat(70));
console.log('SCRAPE ONE CREATOR — DEBUG');
console.log('═'.repeat(70));
console.log('CID:', cid);
console.log('URL:', url);
console.log('');

async function main() {
  console.log('[1] Kết nối GemLogin qua connectCDP()...');
  const { connectCDP } = await import('../src/modules/scraper/helpers/scraper-auth');
  const browser = await connectCDP();
  const ctx = browser.contexts()[0] || await browser.newContext();
  const page = await ctx.newPage();

  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Network.setCacheDisabled', { cacheDisabled: true });

  console.log('[2] Mở trang creator...');
  console.log('');

  // Gọi scrapeContactInTab
  const startTime = Date.now();
  const result = await scrapeContactInTab(
    page,
    cid,
    (blocked) => {
      if (blocked) console.log('⚠️  CAPTCHA BLOCKED');
    },
    'test-user',
  );
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('═'.repeat(70));
  console.log('KẾT QUẢ (', elapsed, 's)');
  console.log('═'.repeat(70));

  if (!result) {
    console.log('❌ Scrape trả về NULL — page chưa load hoặc captcha blocked');
  } else {
    const fields = [
      ['Bio', result.bio],
      ['Followers', result.detailFollowers],
      ['GMV', result.detailGmv],
      ['Categories', result.detailCategories],
      ['Items Sold', result.detailItemsSold],
      ['Revenue Source', result.revenueSource],
      ['Phone', result.phone],
      ['Zalo', result.zalo],
      ['Whatsapp', result.whatsapp],
      ['Email', result.email],
    ];

    let missCount = 0;
    for (const [name, value] of fields) {
      const status = value ? '✅' : '❌';
      if (!value) missCount++;
      console.log(`  ${status} ${name.padEnd(16)} ${value || '(MISS)'}`);
    }
    console.log('');
    console.log(missCount === 0 ? '✅ Tất cả trường OK!' : `⚠️  ${missCount} trường bị miss`);
  }

  // Cũng dump innerText để debug
  console.log('');
  console.log('─'.repeat(70));
  console.log('DOM PROFILE SECTION:');
  console.log('─'.repeat(70));
  const profileSection = await page.evaluate(`
    (function() {
      var allDivs = document.querySelectorAll('div');
      for (var d of allDivs) {
        var t = (d.innerText || '').trim();
        if (t.includes('Điểm') && t.includes('Danh mục') && t.includes('Người theo dõi') && t.length < 1000) {
          return t;
        }
      }
      return '(EMPTY)';
    })()
  `).catch(() => '(ERROR)');
  console.log(profileSection);

  console.log('');
  console.log('─'.repeat(70));
  console.log('DOM DOANH SỐ SECTION:');
  console.log('─'.repeat(70));
  const doanhSo = await page.evaluate(`
    (function() {
      var allDivs = document.querySelectorAll('div');
      for (var d of allDivs) {
        var t = (d.innerText || '').trim();
        if ((t.includes('GMV từ mỗi kênh') || t.includes('Revenue of sales')) && t.includes('Số món bán ra') && t.length < 2000) {
          return t;
        }
        if (t.includes('GMV') && t.includes('Số món bán ra') && t.includes('GPM') && t.length < 800) {
          return t;
        }
      }
      return '(EMPTY)';
    })()
  `).catch(() => '(ERROR)');
  console.log(doanhSo);

  console.log('');
  console.log('─'.repeat(70));
  console.log('TOOLTIP TEST — hover vào "+N" badge:');
  console.log('─'.repeat(70));

  // Test hover badge
  const plusBadges = await page.$$('span, div');
  let foundBadge = false;
  for (const badge of plusBadges) {
    const bt = await badge.textContent().catch(() => '');
    if (!bt || !/\+\s*\d+/.test(bt.trim()) || bt.trim().length > 10) continue;

    const isNearCat = await page.evaluate((el: any) => {
      let p = el;
      for (let i = 0; i < 4; i++) {
        p = p.parentElement;
        if (!p) return false;
        const inner = (p.innerText || '').trim();
        if ((inner.includes('Danh mục') || inner.includes('Categories')) && inner.length < 300) return true;
      }
      return false;
    }, badge).catch(() => false);

    if (!isNearCat) continue;

    foundBadge = true;
    console.log('Badge found:', bt.trim());
    console.log('Hovering...');
    await badge.hover().catch((e: any) => console.log('Hover error:', e.message));
    await page.waitForTimeout(1500);

    const tooltipText = await page.evaluate(`
      (function() {
        var selectors = [
          '[class*="tooltip"]', '[role="tooltip"]', '[class*="popover"]',
          '[class*="Tooltip"]', '[class*="arco-trigger"]', '[class*="popup"]',
          '[class*="tippy"]', '[data-popper]',
        ];
        var all = document.querySelectorAll(selectors.join(','));
        var results = [];
        for (var tip of all) {
          var style = window.getComputedStyle(tip);
          var visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          var t = (tip.textContent || '').trim();
          if (t.length > 3) {
            results.push({
              text: t.slice(0, 200),
              visible: visible,
              class: tip.className.toString().slice(0, 80),
              tag: tip.tagName,
            });
          }
        }
        return results;
      })()
    `).catch(() => []);

    if (tooltipText.length === 0) {
      console.log('❌ Không tìm thấy tooltip nào!');
      // Thử lấy tất cả element mới xuất hiện
      const allPopups = await page.evaluate(`
        (function() {
          var all = document.querySelectorAll('*');
          var results = [];
          for (var el of all) {
            var style = window.getComputedStyle(el);
            if (style.position === 'absolute' || style.position === 'fixed') {
              var t = (el.textContent || '').trim();
              if (t.length > 5 && t.length < 300 && t.includes(',')) {
                results.push({ text: t.slice(0, 200), class: el.className.toString().slice(0, 80), tag: el.tagName });
              }
            }
          }
          return results;
        })()
      `).catch(() => []);
      console.log('Absolute/fixed elements với dấu phẩy:', JSON.stringify(allPopups, null, 2));
    } else {
      console.log('Tooltips tìm thấy:');
      for (const t of tooltipText) {
        console.log(`  ${t.visible ? '✅' : '❌'} [${t.tag}.${t.class.slice(0, 40)}] ${t.text}`);
      }
    }
    break;
  }

  if (!foundBadge) {
    console.log('Không tìm thấy badge "+N" cạnh Danh mục');
    // Debug: tìm TẤT CẢ element chứa "+N"
    console.log('');
    console.log('Tất cả elements chứa "+N":');
    const allPlus = await page.evaluate(`
      (function() {
        var els = document.querySelectorAll('span, div, a');
        var results = [];
        for (var el of els) {
          var t = (el.textContent || '').trim();
          if (/\\+\\s*\\d+/.test(t) && t.length <= 10) {
            var parent4 = '';
            var p = el;
            for (var i = 0; i < 4; i++) { p = p.parentElement; if (!p) break; }
            if (p) parent4 = (p.innerText || '').trim().slice(0, 150);
            results.push({
              text: t,
              tag: el.tagName,
              class: el.className.toString().slice(0, 60),
              parentContainsDanhMuc: parent4.includes('Danh mục') || parent4.includes('Categories'),
              parent4Text: parent4.slice(0, 100),
            });
          }
        }
        return results;
      })()
    `).catch(() => []);
    for (const r of allPlus) {
      console.log(`  [${r.tag}] "${r.text}" class="${r.class}" nearCat=${r.parentContainsDanhMuc} parent="${r.parent4Text}"`);
    }
  }

  await page.close();
  console.log('');
  console.log('Done!');
  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
