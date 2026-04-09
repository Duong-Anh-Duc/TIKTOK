/**
 * TikTok Scraper — Contact scraping helpers
 * Functions to scrape contact info (phone, zalo, whatsapp, email) from creator detail pages
 */
import { logger } from '../../../utils/logger';
import { solveCaptchaIfPresent, detectCaptcha } from '../../../utils/captcha-solver';
import { autoLoginIfNeeded } from './scraper-auth';
import { SHOP_ID, SHOP_REGION } from '../../../constants';

export interface ContactResult {
  bio: string;
  phone: string;
  zalo: string;
  whatsapp: string;
  email: string;
  detailFollowers: string;
  detailGmv: string;
  detailCategories: string;
  detailItemsSold: string;
  revenueSource: string;
}

/**
 * Cào contact info + doanh số từ detail page
 */
export async function scrapeContactInTab(
  page: any,
  cid: string,
  setCaptchaBlocked: (v: boolean) => void,
): Promise<ContactResult | null> {
  try {
    let gotProfile = false;
    let gotPerformance = false;
    let bio = '';

    const onResponse = async (resp: any) => {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        if (resp.url().includes('/creator/marketplace/profile')) {
          const json = await resp.json().catch(() => null);
          if (json?.creator_profile) {
            gotProfile = true;
            bio = json.creator_profile.bio?.value || '';
          }
        }
        // Detect khi phần doanh số/biểu đồ đã load
        if (resp.url().includes('/creator/marketplace/performance') ||
            resp.url().includes('/creator/marketplace/revenue') ||
            resp.url().includes('/creator/marketplace/gmv')) {
          gotPerformance = true;
        }
      } catch {}
    };
    page.on('response', onResponse);

    const url = 'https://affiliate.tiktok.com/connection/creator/detail?cid=' + cid + '&shop_region=' + SHOP_REGION + '&shop_id=' + SHOP_ID;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);

    const loggedIn = await autoLoginIfNeeded(page);
    if (!loggedIn) { setCaptchaBlocked(true); page.removeListener('response', onResponse); return null; }
    if (page.url().includes('/account/login') === false && !page.url().includes('cid=' + cid)) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);
    }

    // Captcha: chờ đến khi cả profile VÀ biểu đồ doanh số load xong
    for (let captchaRound = 0; captchaRound < 3; captchaRound++) {
      const hasCaptcha = !!(await detectCaptcha(page));
      if (!hasCaptcha) break;

      logger.info('[Scraper] Captcha detected (round ' + (captchaRound + 1) + '), solving...');
      const solved = await solveCaptchaIfPresent(page);
      if (!solved) { setCaptchaBlocked(true); page.removeListener('response', onResponse); return null; }

      if (!gotProfile || !gotPerformance) {
        logger.info('[Scraper] Data chưa load đầy đủ (profile=' + gotProfile + ', performance=' + gotPerformance + ') → reload page...');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1500);
      } else {
        logger.info('[Scraper] Data đã load đầy đủ, dismiss captcha xong → tiếp tục cào');
        await page.waitForTimeout(1000);
        break;
      }
    }

    // Chờ cả profile và performance data load
    const deadline = Date.now() + 8000;
    while ((!gotProfile || !gotPerformance) && Date.now() < deadline) {
      await page.waitForTimeout(300);
    }
    if (!gotPerformance) {
      // Scroll xuống để trigger load biểu đồ
      await page.evaluate('window.scrollBy(0, 600)');
      await page.waitForTimeout(1500);
    }
    page.removeListener('response', onResponse);
    await page.waitForTimeout(500);

    // Fallback bio from DOM
    if (!bio) {
      bio = await page.evaluate(`
        (function() {
          var container = document.querySelector('div.px-16');
          if (container) {
            var bioDiv = container.querySelector('div[class*="flex-grow"][class*="relative"]');
            if (bioDiv) {
              var t = (bioDiv.innerText || '').trim();
              if (t.length > 3) return t;
            }
          }
          var spans = document.querySelectorAll('span[class*="break-words"][class*="whitespace-pre-wrap"]');
          for (var s of spans) {
            var t = (s.innerText || '').trim();
            if (t.length > 3 && t.length < 1000) return t;
          }
          return '';
        })()
      `).catch(() => '');
    }

    // Followers từ DOM
    let detailFollowers = '';
    detailFollowers = await page.evaluate(`
      (function() {
        var els = document.querySelectorAll('div, span');
        for (var i = 0; i < els.length; i++) {
          var t = (els[i].textContent || '').trim();
          if (t === 'Người theo dõi' || t === 'Followers') {
            // Giá trị nằm ở sibling hoặc dòng kế trong parent
            var parent = els[i].parentElement;
            if (parent) {
              var lines = parent.innerText.split('\\n').map(function(l) { return l.trim(); }).filter(Boolean);
              for (var j = 0; j < lines.length; j++) {
                if (lines[j] === t && j + 1 < lines.length) {
                  return lines[j + 1];
                }
              }
              // Nếu parent chỉ chứa label, check previous sibling
              var prev = els[i].previousElementSibling;
              if (prev) {
                var v = (prev.textContent || '').trim();
                if (v.match(/[\\d,.]+(K|M|B|Tr)?/i)) return v;
              }
              var next = els[i].nextElementSibling;
              if (next) {
                var v2 = (next.textContent || '').trim();
                if (v2.match(/[\\d,.]+(K|M|B|Tr)?/i)) return v2;
              }
            }
          }
        }
        return '';
      })()
    `).catch(() => '');

    // Phone
    let phone = '';
    const text = await page.evaluate('document.body.innerText');
    const bioPhoneMatch = bio.match(/(?:0|\+84)\d{9,10}/);
    if (bioPhoneMatch) {
      phone = bioPhoneMatch[0];
    } else {
      const pm = text.match(/(?:0|\+84)\d{9,10}/);
      if (pm) phone = pm[0];
    }

    // Contact icons
    let email = '';
    let zalo = '';
    let whatsapp = '';

    const icons = await page.evaluate(`
      (function() {
        var r = [];
        var nameEl = document.querySelector('h1, [class*="handle"], [class*="nickname"]');
        var nameRect = nameEl ? nameEl.getBoundingClientRect() : null;
        var minY = nameRect ? nameRect.top - 20 : 150;
        var maxY = nameRect ? nameRect.bottom + 40 : 300;
        var minX = nameRect ? nameRect.right - 20 : 200;

        document.querySelectorAll('svg, img').forEach(function(el) {
          var rect = el.getBoundingClientRect();
          if (rect.width >= 16 && rect.width <= 40 && rect.height >= 16 && rect.height <= 40
              && rect.top >= minY && rect.top <= maxY && rect.left >= minX) {
            if (rect.left < 100) return;
            r.push({ x: Math.round(rect.left + rect.width/2), y: Math.round(rect.top + rect.height/2) });
          }
        });
        return r;
      })()
    `);

    logger.info('[Scraper] Icons found: ' + icons.length);

    for (const icon of icons.slice(0, 4)) {
      const result = await page.evaluate(`
        new Promise(function(resolve) {
          var el = document.elementFromPoint(${icon.x}, ${icon.y});
          if (!el) { resolve({ found: false, email: '', zalo: '', whatsapp: '' }); return; }
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          var attempts = 0;
          var timer = setInterval(function() {
            attempts++;
            var divs = document.querySelectorAll('div');
            for (var d of divs) {
              var t = d.innerText || '';
              if (t.indexOf('Thông tin liên hệ') >= 0 && t.length < 500) {
                clearInterval(timer);
                var email = '';
                var allEls = d.querySelectorAll('span, div, a, p');
                for (var span of allEls) {
                  var title = span.getAttribute('title') || '';
                  if (title && title.indexOf('@') >= 0) { email = title; break; }
                  var aria = span.getAttribute('aria-label') || '';
                  if (aria && aria.indexOf('@') >= 0) { email = aria; break; }
                }
                if (!email) {
                  var tooltips = document.querySelectorAll('.arco-tooltip-content, [class*="tooltip"], [role="tooltip"]');
                  for (var tip of tooltips) {
                    var tipText = tip.textContent.trim();
                    if (tipText.indexOf('@') >= 0) { email = tipText; break; }
                  }
                }
                if (!email) {
                  var em = t.match(/([a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,})/);
                  if (em) email = em[1];
                }
                if (email) {
                  var cleanEm = email.match(/([a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,})/);
                  email = cleanEm ? cleanEm[1] : '';
                }
                var za = t.match(/Zalo:\\s*(\\d{6,15})/);
                var wa = t.match(/Whatsapp:\\s*(\\d{6,15})/);
                document.querySelectorAll('button, div, span').forEach(function(b) {
                  if (b.textContent.trim() === 'Đã hiểu') b.click();
                });
                resolve({ found: true, email: email, zalo: za ? za[1] : '', whatsapp: wa ? wa[1] : '' });
                return;
              }
            }
            if (attempts > 8) { clearInterval(timer); resolve({ found: false, email: '', zalo: '', whatsapp: '' }); }
          }, 150);
        })
      `);
      if (result.found) {
        if (result.email && !email) email = result.email;
        if (result.zalo && !zalo) zalo = result.zalo;
        if (result.whatsapp && !whatsapp) whatsapp = result.whatsapp;
        break;
      }
      await page.waitForTimeout(300);
    }

    // Hover tooltip fallback for email
    if (!email && icons.length > 0) {
      for (const icon of icons.slice(0, 3)) {
        await page.mouse.move(icon.x, icon.y);
        await page.waitForTimeout(500);
        const tipEmail = await page.evaluate(`
          (function() {
            var tooltips = document.querySelectorAll('.arco-tooltip-content, [class*="tooltip"], [role="tooltip"]');
            for (var tip of tooltips) {
              var t = tip.textContent.trim();
              if (t.indexOf('@') >= 0) {
                var m = t.match(/([a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,})/);
                return m ? m[1] : t;
              }
            }
            return '';
          })()
        `);
        if (tipEmail) { email = tipEmail; break; }
      }
    }

    // Scroll xuống để load biểu đồ doanh số
    await page.evaluate('window.scrollBy(0, 800)');
    await page.waitForTimeout(2000);

    // Scrape GMV, Số món bán ra, Nguồn doanh thu từ block text "Doanh số"
    const detailData = await page.evaluate(`
      (function() {
        var result = { gmv: '', itemsSold: '', categories: '', revenueSource: '' };

        // Tìm block chứa "GMV từ mỗi kênh bán hàng" — block này có toàn bộ data cần thiết
        var allDivs = document.querySelectorAll('div');
        var perfBlock = '';
        for (var d of allDivs) {
          var t = (d.innerText || '').trim();
          if (t.includes('GMV từ mỗi kênh') && t.includes('Số món bán ra') && t.length < 2000) {
            perfBlock = t;
            break;
          }
        }

        if (perfBlock) {
          var lines = perfBlock.split('\\n').map(function(l) { return l.trim(); }).filter(Boolean);

          // GMV: dòng ngay sau "GMV" (nhưng trước "Số món bán ra")
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].match(/^GMV\\s*$/) || lines[i].match(/^GMV\\s*[①②③]?$/)) {
              if (i + 1 < lines.length) {
                result.gmv = lines[i + 1];
              }
              break;
            }
          }

          // Số món bán ra: dòng ngay sau "Số món bán ra"
          for (var j = 0; j < lines.length; j++) {
            if (lines[j].match(/^Số món bán ra/i) || lines[j].match(/^Items sold/i)) {
              if (j + 1 < lines.length) {
                result.itemsSold = lines[j + 1];
              }
              break;
            }
          }

          // Nguồn doanh thu: parse "GMV từ mỗi kênh bán hàng" section
          var revIdx = -1;
          for (var k = 0; k < lines.length; k++) {
            if (lines[k].match(/GMV từ mỗi kênh/i) || lines[k].match(/GMV by sales channel/i)) {
              revIdx = k + 1;
              break;
            }
          }
          // Tìm end index (GMV theo hạng mục hoặc end of block)
          var revEndIdx = lines.length;
          for (var m = revIdx; m < lines.length; m++) {
            if (lines[m].match(/GMV theo hạng mục/i) || lines[m].match(/GMV by product/i)) {
              revEndIdx = m;
              break;
            }
          }
          if (revIdx > 0 && revIdx < lines.length) {
            // Format: LIVE\\nVideo\\nThẻ sản phẩm\\n83,19%\\n16,29%\\n0,52%
            // Hoặc: LIVE\\n83,19%\\nVideo\\n16,29%\\nThẻ sản phẩm\\n0,52%
            var revLines = lines.slice(revIdx, revEndIdx);
            var channelNames = [];
            var channelPcts = [];
            for (var n = 0; n < revLines.length; n++) {
              if (revLines[n].match(/^[\\d,]+[.,]\\d+%$/)) {
                channelPcts.push(revLines[n]);
              } else if (revLines[n].length > 1 && !revLines[n].match(/^[\\d,]+[.,]\\d+%$/)) {
                channelNames.push(revLines[n]);
              }
            }
            var revItems = [];
            for (var r = 0; r < channelNames.length && r < channelPcts.length; r++) {
              revItems.push(channelNames[r] + ' ' + channelPcts[r]);
            }
            if (revItems.length > 0) {
              result.revenueSource = revItems.join(', ');
            }
          }
        }

        // Hạng mục sản phẩm: lấy từ phần "Danh mục" ở profile trên cùng
        // Cũng lấy từ "GMV theo hạng mục sản phẩm" nếu có
        var catFromChart = [];
        var catIdx = -1;
        if (perfBlock) {
          var pLines = perfBlock.split('\\n').map(function(l) { return l.trim(); }).filter(Boolean);
          for (var p = 0; p < pLines.length; p++) {
            if (pLines[p].match(/GMV theo hạng mục/i) || pLines[p].match(/GMV by product/i)) {
              catIdx = p + 1;
              break;
            }
          }
          if (catIdx > 0) {
            for (var q = catIdx; q < pLines.length; q++) {
              if (pLines[q].match(/\\d+[.,]\\d+%/)) continue;
              if (pLines[q].match(/^(Khác|Other)$/i)) { catFromChart.push(pLines[q]); continue; }
              if (pLines[q].length > 2 && pLines[q].length < 100 && !pLines[q].match(/\\d+[.,]\\d+%/)) {
                catFromChart.push(pLines[q]);
              }
            }
          }
        }
        if (catFromChart.length > 0) {
          result.categories = catFromChart.filter(function(c) { return c !== 'Khác' && c !== 'Other'; }).join(', ');
        }

        return result;
      })()
    `).catch(() => ({ gmv: '', itemsSold: '', categories: '', revenueSource: '' }));

    // Fallback categories: hover vào "+2" để lấy danh mục đầy đủ
    let detailCategories = detailData.categories || '';
    if (!detailCategories) {
      // Lấy từ phần "Danh mục" ở profile header
      const headerCat = await page.evaluate(`
        (function() {
          var els = document.querySelectorAll('div, span');
          for (var el of els) {
            var t = (el.textContent || '').trim();
            if (t === 'Danh mục' || t === 'Categories') {
              var parent = el.closest('div');
              if (parent) {
                var fullText = parent.innerText.replace(/^(Danh mục|Categories)\\s*/, '').trim();
                return fullText.replace(/\\n/g, ', ').replace(/, \\+/g, '');
              }
            }
          }
          return '';
        })()
      `).catch(() => '');
      if (headerCat) detailCategories = headerCat;
    }
    // Nếu categories vẫn có "+N", hover vào để lấy tooltip
    if (detailCategories.includes('+')) {
      const plusEl = await page.$('span:has-text("+")');
      if (plusEl) {
        await plusEl.hover();
        await page.waitForTimeout(1000);
        const tooltipCat = await page.evaluate(`
          (function() {
            var tips = document.querySelectorAll('[class*="tooltip"], [role="tooltip"], [class*="popover"], [class*="Tooltip"]');
            for (var tip of tips) {
              var t = (tip.textContent || '').trim();
              if (t.includes('Hạng mục') || t.length > 10) {
                return t.replace(/^Hạng mục sản phẩm:\\s*/i, '').replace(/^Categories:\\s*/i, '').trim();
              }
            }
            return '';
          })()
        `).catch(() => '');
        if (tooltipCat && tooltipCat.length > detailCategories.length) {
          detailCategories = tooltipCat;
        }
      }
    }

    return {
      bio, phone, zalo, whatsapp, email,
      detailFollowers,
      detailGmv: detailData.gmv || '',
      detailCategories,
      detailItemsSold: detailData.itemsSold || '',
      revenueSource: detailData.revenueSource || '',
    };
  } catch {
    return null;
  }
}
