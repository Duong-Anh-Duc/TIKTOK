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
 * Dump innerText của trang detail vào file txt để debug
 */
async function dumpDomDebug(page: any, username: string, cid: string): Promise<void> {
  try {
    const fs = await import('fs');
    const pathMod = await import('path');
    const debugDir = pathMod.resolve(__dirname, '..', '..', '..', '..', 'data', 'scrape-debug');
    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });

    const dump = await page.evaluate(`
      (function() {
        var result = {
          url: window.location.href,
          title: document.title,
          bodyText: '',
          profileSection: '',
          doanhSoSection: '',
          allLabels: []
        };

        // Toàn bộ body innerText
        result.bodyText = document.body.innerText || '';

        // Profile header section (chứa Điểm/Danh mục/Người theo dõi)
        var allDivs = document.querySelectorAll('div');
        for (var d of allDivs) {
          var t = (d.innerText || '').trim();
          if (t.includes('Điểm') && t.includes('Danh mục') && t.includes('Người theo dõi') && t.length < 1000) {
            result.profileSection = t;
            break;
          }
        }

        // Doanh số section
        for (var d2 of allDivs) {
          var t2 = (d2.innerText || '').trim();
          if (t2.includes('GMV') && t2.includes('Số món bán ra') && t2.length < 3000) {
            result.doanhSoSection = t2;
            break;
          }
        }

        // Tất cả label nhỏ (để debug DOM structure)
        var smallEls = document.querySelectorAll('div, span, h3, h4, label');
        var seen = {};
        for (var el of smallEls) {
          if (el.children.length > 1) continue;
          var et = (el.textContent || '').trim();
          if (et.length === 0 || et.length > 50) continue;
          if (seen[et]) continue;
          seen[et] = true;
          if (/^(GMV|Số món bán ra|Items sold|GPM|Danh mục|Categories|Điểm|Người theo dõi|Followers|Hạng mục)/i.test(et)) {
            result.allLabels.push({
              text: et,
              tag: el.tagName,
              nextSibling: el.nextElementSibling ? (el.nextElementSibling.textContent || '').trim().slice(0, 100) : null,
              parentText: el.parentElement ? (el.parentElement.textContent || '').trim().slice(0, 200) : null,
            });
          }
        }

        return result;
      })()
    `).catch(() => null);

    if (!dump) return;

    const safeName = (username || cid).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 50);
    const filePath = pathMod.resolve(debugDir, safeName + '.txt');

    const content = [
      '='.repeat(80),
      'CREATOR DOM DUMP',
      '='.repeat(80),
      'Username: ' + username,
      'CID:      ' + cid,
      'URL:      ' + dump.url,
      'Title:    ' + dump.title,
      'Time:     ' + new Date().toLocaleString(),
      '',
      '─'.repeat(80),
      'PROFILE SECTION (Điểm/Danh mục/Người theo dõi)',
      '─'.repeat(80),
      dump.profileSection || '(EMPTY — không tìm thấy block profile)',
      '',
      '─'.repeat(80),
      'DOANH SỐ SECTION (GMV/Số món bán ra/...)',
      '─'.repeat(80),
      dump.doanhSoSection || '(EMPTY — không tìm thấy block doanh số)',
      '',
      '─'.repeat(80),
      'ALL LABELS DETECTED (DOM structure debug)',
      '─'.repeat(80),
      ...dump.allLabels.map((l: any) =>
        '• [' + l.tag + '] "' + l.text + '"\n' +
        '    nextSibling: ' + (l.nextSibling || '(null)') + '\n' +
        '    parentText:  ' + (l.parentText || '(null)').replace(/\n/g, ' ⏎ ')
      ),
      '',
      '─'.repeat(80),
      'FULL BODY INNERTEXT',
      '─'.repeat(80),
      dump.bodyText,
      '',
    ].join('\n');

    fs.writeFileSync(filePath, content);
    logger.info('[Scraper] DOM dump: scrape-debug/' + safeName + '.txt');
  } catch (e: any) {
    logger.warn('[Scraper] Không dump được DOM: ' + e.message);
  }
}

/**
 * Cào contact info + doanh số từ detail page
 */
export async function scrapeContactInTab(
  page: any,
  cid: string,
  setCaptchaBlocked: (v: boolean) => void,
  username?: string,
): Promise<ContactResult | null> {
  try {
    let gotProfile = false;
    let gotPerformance = false;
    let bio = '';
    let apiCategories = '';  // Categories lấy từ API (chính xác nhất)
    let apiFollowers = '';

    const onResponse = async (resp: any) => {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        if (resp.url().includes('/creator/marketplace/profile')) {
          const json = await resp.json().catch(() => null);
          if (json?.creator_profile) {
            gotProfile = true;
            bio = json.creator_profile.bio?.value || '';
            // Extract categories từ API
            // Extract categories: thử nhiều key formats
            const cp = json.creator_profile;
            const catList = cp.content_category_list || cp.category_list || cp.categories;
            if (Array.isArray(catList) && catList.length > 0) {
              apiCategories = catList.map((c: any) => c.value || c.name || c.label || c).join(', ');
            }
            // Fallback: key "category" có structure { value: [{name: "..."}, ...] }
            if (!apiCategories && cp.category?.value && Array.isArray(cp.category.value)) {
              apiCategories = cp.category.value.map((c: any) => c.name || c.value || c.label || c).join(', ');
            }
            if (apiCategories) logger.info('[Scraper] API categories: ' + apiCategories);
            // Extract followers từ API
            const fc = json.creator_profile.follower_cnt?.value || json.creator_profile.followers?.value;
            if (fc) apiFollowers = String(fc);
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

    // Detect "Lỗi tải dữ liệu" và reload tối đa 2 lần trong cùng tab
    // (nếu vẫn fail sẽ return null → outer retry sẽ tạo tab mới)
    const MAX_RELOAD_ATTEMPTS = 2;
    let dataLoaded = false;
    for (let attempt = 0; attempt < MAX_RELOAD_ATTEMPTS; attempt++) {
      // Đợi DOM render — poll cho đến khi GMV card có VALUE thực (không phải "--" hoặc lỗi)
      const domDeadline = Date.now() + 10000;
      while (Date.now() < domDeadline) {
        const status = await page.evaluate(`
          (function() {
            // Check 1: Có đang hiển thị "Tải dữ liệu không thành công"?
            var bodyText = document.body.innerText || '';
            var hasError = bodyText.includes('Tải dữ liệu không thành công') ||
                           bodyText.includes('Failed to load data');

            // Check 2: GMV card có VALUE thực không?
            var labels = document.querySelectorAll('div, span');
            var gmvHasValue = false;
            for (var el of labels) {
              if (el.children.length > 1) continue;
              var t = (el.textContent || '').trim().replace(/[ⓘ?]/g, '').trim();
              if (t !== 'GMV') continue;
              // Walk up parent → tìm value
              var cur = el;
              for (var d = 0; d < 5; d++) {
                cur = cur.parentElement;
                if (!cur) break;
                var inner = (cur.innerText || '').trim();
                var lines = inner.split('\\n').map(function(l) { return l.trim().replace(/[ⓘ?]/g, '').trim(); }).filter(Boolean);
                for (var k = 0; k < lines.length - 1; k++) {
                  if (lines[k] === 'GMV') {
                    var val = lines[k + 1];
                    // Value hợp lệ: phải có số hoặc range, KHÔNG phải "--"
                    if (val && val !== '--' && /[\\d]/.test(val)) {
                      gmvHasValue = true;
                      break;
                    }
                  }
                }
                if (gmvHasValue) break;
              }
              if (gmvHasValue) break;
            }

            // Check 3: Profile section có "Người theo dõi" với value không?
            var profileOk = false;
            for (var el2 of labels) {
              if (el2.children.length > 1) continue;
              var t2 = (el2.textContent || '').trim();
              if (t2 !== 'Người theo dõi' && t2 !== 'Followers') continue;
              var sib = el2.nextElementSibling;
              if (sib) {
                var v = (sib.textContent || '').trim();
                if (/^[\\d,.]+\\s*(K|M|B|Tr)?$/i.test(v)) { profileOk = true; break; }
              }
            }

            return { hasError: hasError, gmvHasValue: gmvHasValue, profileOk: profileOk };
          })()
        `).catch(() => ({ hasError: false, gmvHasValue: false, profileOk: false }));

        // Nếu có error → break để click "Thử lại"
        if (status.hasError) break;
        // Nếu cả profile và GMV đều OK → done
        if (status.profileOk && status.gmvHasValue) {
          dataLoaded = true;
          break;
        }
        await page.waitForTimeout(400);
      }

      if (dataLoaded) break;

      // Detect lại error và profile status để quyết định reload
      const finalStatus = await page.evaluate(`
        (function() {
          var bodyText = document.body.innerText || '';
          return {
            hasError: bodyText.includes('Tải dữ liệu không thành công') || bodyText.includes('Failed to load data'),
          };
        })()
      `).catch(() => ({ hasError: false }));

      if (attempt < MAX_RELOAD_ATTEMPTS - 1) {
        logger.info('[Scraper] Data load lỗi/chưa đủ (attempt ' + (attempt + 1) + '/' + MAX_RELOAD_ATTEMPTS + ')' +
          (finalStatus.hasError ? ' — phát hiện "Lỗi tải dữ liệu"' : '') + ' → reload page...');

        // Reset flags + reload
        gotProfile = false;
        gotPerformance = false;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2000);

        // Đợi API response
        const apiDl = Date.now() + 6000;
        while ((!gotProfile || !gotPerformance) && Date.now() < apiDl) {
          await page.waitForTimeout(300);
        }
        // Scroll để trigger load
        await page.evaluate('window.scrollBy(0, 800)').catch(() => {});
        await page.waitForTimeout(1500);
      }
    }

    if (!dataLoaded) {
      logger.warn('[Scraper] Data chưa load đầy đủ trong tab này (cid=' + cid + ') → return null để outer retry tạo tab mới');
      page.removeListener('response', onResponse);
      return null;
    }
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

    // Followers từ DOM — chỉ accept format số (vd: 1,1K, 965, 14,7K)
    let detailFollowers = '';
    detailFollowers = await page.evaluate(`
      (function() {
        var followerRegex = /^[\\d,.]+\\s*(K|M|B|Tr)?$/i;
        var els = document.querySelectorAll('div, span');
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el.children.length > 1) continue;
          var t = (el.textContent || '').trim();
          if (t !== 'Người theo dõi' && t !== 'Followers') continue;

          // Strategy 1: nextElementSibling
          var sib = el.nextElementSibling;
          if (sib) {
            var v = (sib.textContent || '').trim();
            if (followerRegex.test(v)) return v;
          }
          // Strategy 2: parent có 2 children → child kia
          var parent = el.parentElement;
          if (parent && parent.children.length === 2) {
            for (var ch of parent.children) {
              if (ch === el) continue;
              var v2 = (ch.textContent || '').trim();
              if (followerRegex.test(v2)) return v2;
            }
          }
        }
        return '';
      })()
    `).catch(() => '');

    // Fallback followers từ API nếu DOM miss
    if (!detailFollowers && apiFollowers) detailFollowers = apiFollowers;

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

    // Scrape GMV, Số món bán ra, Nguồn doanh thu, Hạng mục — extractor mới (nextElementSibling + walk up)
    const detailData = await page.evaluate(`
      (function() {
        var result = { gmv: '', itemsSold: '', categories: '', revenueSource: '' };
        var junkPattern = /(Điểm|Chưa có điểm|Người theo dõi|Followers|Mời|Invite|Doanh số|Số liệu|Xu hướng|Video ví dụ|Nhà sáng tạo)/i;
        var labelPattern = /^(GMV|GPM|Số món bán ra|Items sold|Danh mục|Categories|Người theo dõi|Followers|Điểm|Chưa có điểm)$/i;

        // Tìm element có text exact match label, đơn giản (ít children)
        function findLabelEl(labelTexts) {
          var els = document.querySelectorAll('span, div, h3, h4, label');
          for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.children.length > 1) continue;
            var t = (el.textContent || '').trim();
            for (var j = 0; j < labelTexts.length; j++) {
              if (t === labelTexts[j]) return el;
            }
          }
          return null;
        }

        // Từ label el → tìm value qua nextElementSibling hoặc walk up parent
        function getValueFromLabel(labelEl, valueRegex) {
          // Strategy 1: nextElementSibling
          var sib = labelEl.nextElementSibling;
          if (sib) {
            var v = (sib.textContent || '').trim();
            if (v && v.length < 100 && !labelPattern.test(v) && !junkPattern.test(v)) {
              if (!valueRegex || valueRegex.test(v)) return v;
            }
          }
          // Strategy 2: walk up parent → tìm dòng kế label trong innerText
          var labelText = (labelEl.textContent || '').trim().replace(/[ⓘ?]/g, '').trim();
          var cur = labelEl;
          for (var d = 0; d < 5; d++) {
            cur = cur.parentElement;
            if (!cur) break;
            var inner = (cur.innerText || '').trim();
            var lines = inner.split('\\n').map(function(l) { return l.trim().replace(/[ⓘ?]/g, '').trim(); }).filter(Boolean);
            for (var k = 0; k < lines.length - 1; k++) {
              if (lines[k] === labelText) {
                var val = lines[k + 1];
                if (val && val.length < 100 && !labelPattern.test(val) && !junkPattern.test(val)) {
                  if (!valueRegex || valueRegex.test(val)) return val;
                }
              }
            }
          }
          return '';
        }

        // GMV — chỉ "GMV" exact
        var gmvEl = findLabelEl(['GMV']);
        if (gmvEl) {
          result.gmv = getValueFromLabel(gmvEl, /[\\d,.\\-]/);
        }

        // Số món bán ra
        var itemsEl = findLabelEl(['Số món bán ra', 'Items sold']);
        if (itemsEl) {
          result.itemsSold = getValueFromLabel(itemsEl, /^[\\d,.\\-]+/);
        }

        // Nguồn doanh thu (GMV từ mỗi kênh bán hàng / Revenue of sales channel)
        var revEl = findLabelEl(['GMV từ mỗi kênh bán hàng', 'GMV by sales channel', 'Revenue of sales channel']);
        if (revEl) {
          var cur = revEl;
          for (var dr = 0; dr < 5; dr++) {
            cur = cur.parentElement;
            if (!cur) break;
            var inner = (cur.innerText || '').trim();
            if (inner.length > 800) break;
            var lines = inner.split('\\n').map(function(l) { return l.trim(); }).filter(Boolean);
            var labelIdx = -1;
            for (var li = 0; li < lines.length; li++) {
              if (/GMV từ mỗi kênh|Revenue of sales channel/i.test(lines[li])) { labelIdx = li; break; }
            }
            if (labelIdx < 0) continue;
            var endIdx = lines.length;
            for (var ei = labelIdx + 1; ei < lines.length; ei++) {
              if (/GMV theo hạng mục|GMV by product|Revenue of categories/i.test(lines[ei])) { endIdx = ei; break; }
            }
            var revLines = lines.slice(labelIdx + 1, endIdx);
            revLines = revLines.filter(function(l) { return l !== '100%' && l !== '--'; });
            var names = [], pcts = [];
            for (var rli = 0; rli < revLines.length; rli++) {
              var rl = revLines[rli];
              if (/^[\\d,]+[.,]\\d+%$/.test(rl)) pcts.push(rl);
              else if (rl.length > 1 && !/^\\d+%$/.test(rl)) names.push(rl);
            }
            // Dedupe names
            var seen = {};
            var uniqueNames = [];
            for (var ni = 0; ni < names.length; ni++) {
              if (!seen[names[ni]]) { seen[names[ni]] = true; uniqueNames.push(names[ni]); }
            }
            var items = [];
            for (var ri = 0; ri < uniqueNames.length && ri < pcts.length; ri++) {
              items.push(uniqueNames[ri] + ' ' + pcts[ri]);
            }
            if (items.length > 0) {
              result.revenueSource = items.join(', ');
              break;
            }
          }
        }

        // Hạng mục sản phẩm: tìm "Danh mục" exact → nextElementSibling
        var catEl = findLabelEl(['Danh mục', 'Categories']);
        if (catEl) {
          var sib2 = catEl.nextElementSibling;
          if (sib2) {
            var sibText = (sib2.textContent || '').trim();
            sibText = sibText.replace(/\\s*,?\\s*\\+\\s*\\d+\\s*$/, '').trim();
            if (sibText && sibText.length > 2 && sibText.length < 200 && !junkPattern.test(sibText)) {
              result.categories = sibText;
            }
          }
          if (!result.categories) {
            var parent2 = catEl.parentElement;
            if (parent2 && parent2.children.length === 2) {
              for (var ch of parent2.children) {
                if (ch === catEl) continue;
                var chText = (ch.textContent || '').trim();
                chText = chText.replace(/\\s*,?\\s*\\+\\s*\\d+\\s*$/, '').trim();
                if (chText && chText.length > 2 && chText.length < 200 && !junkPattern.test(chText)) {
                  result.categories = chText;
                  break;
                }
              }
            }
          }
        }

        // Fallback categories: từ chart "GMV theo hạng mục sản phẩm"
        if (!result.categories) {
          var chartEl = findLabelEl(['GMV theo hạng mục sản phẩm', 'GMV by product category', 'Revenue of categories', 'Revenue of product categories']);
          if (chartEl) {
            var cur2 = chartEl;
            for (var dc = 0; dc < 5; dc++) {
              cur2 = cur2.parentElement;
              if (!cur2) break;
              var inner2 = (cur2.innerText || '').trim();
              if (inner2.length > 800) break;
              var lines2 = inner2.split('\\n').map(function(l) { return l.trim(); }).filter(Boolean);
              var startIdx = -1;
              for (var li2 = 0; li2 < lines2.length; li2++) {
                if (/GMV theo hạng mục|Revenue of categor/i.test(lines2[li2])) { startIdx = li2 + 1; break; }
              }
              if (startIdx < 0) continue;
              var cats = [];
              var seenCat = {};
              for (var ci = startIdx; ci < lines2.length; ci++) {
                var cl = lines2[ci];
                if (cl === '100%' || /^\\d+[.,]\\d+%$/.test(cl) || /^\\d+%$/.test(cl)) continue;
                if (cl === 'Khác' || cl === 'Other') continue;
                if (junkPattern.test(cl) || labelPattern.test(cl)) break;
                if (cl.length > 2 && cl.length < 80 && !seenCat[cl]) {
                  seenCat[cl] = true;
                  cats.push(cl);
                }
              }
              if (cats.length > 0) {
                result.categories = cats.join(', ');
                break;
              }
            }
          }
        }

        return result;
      })()
    `).catch(() => ({ gmv: '', itemsSold: '', categories: '', revenueSource: '' }));

    // Ưu tiên categories từ API (đầy đủ nhất), fallback DOM
    let detailCategories = apiCategories || detailData.categories || '';

    // Lấy đầy đủ categories: hover vào nextSibling span chứa "+N" (là text node, không phải element riêng)
    // Structure: <span>Danh mục</span> <span class="flex"><span>Trang phục nữ &...</span>, +2</span>
    try {
      const catSibHandle = await page.evaluateHandle(`
        (function() {
          var labels = document.querySelectorAll('span, div');
          for (var el of labels) {
            if (el.children.length > 1) continue;
            var t = (el.textContent || '').trim();
            if (t !== 'Danh mục' && t !== 'Categories') continue;
            var sib = el.nextElementSibling;
            if (sib && /\\+\\s*\\d+/.test(sib.textContent || '')) return sib;
          }
          return null;
        })()
      `);
      const catSib = catSibHandle.asElement();
      if (catSib) {
        // Hover
        await catSib.hover().catch(() => {});
        await page.waitForTimeout(1500);

        const readTooltip = `
          (function() {
            var selectors = [
              '[class*="tooltip"]', '[role="tooltip"]', '[class*="popover"]',
              '[class*="Tooltip"]', '[class*="arco-trigger"]', '[class*="popup"]',
              '[class*="tippy"]', '[data-popper]',
            ];
            var all = document.querySelectorAll(selectors.join(','));
            for (var tip of all) {
              var style = window.getComputedStyle(tip);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
              var t = (tip.textContent || '').trim();
              if (t.length > 5 && (t.includes(',') || t.includes('&'))) {
                return t
                  .replace(/^Hạng mục sản phẩm[:\\s]*/i, '')
                  .replace(/^Product categor(y|ies)[:\\s]*/i, '')
                  .replace(/^Categories[:\\s]*/i, '')
                  .trim();
              }
            }
            return '';
          })()
        `;

        let fullCat = await page.evaluate(readTooltip);

        // Fallback: click nếu hover không trigger tooltip
        if (!fullCat) {
          await catSib.click().catch(() => {});
          await page.waitForTimeout(1200);
          fullCat = await page.evaluate(readTooltip);
        }

        if (fullCat && fullCat.length > (detailCategories || '').length) {
          detailCategories = fullCat;
          logger.info('[Scraper] Categories từ tooltip: ' + detailCategories);
        }
      }
    } catch (e: any) {
      logger.warn('[Scraper] Hover +N tooltip lỗi: ' + e.message);
    }

    // Loại bỏ trailing "+N" nếu vẫn còn
    detailCategories = detailCategories.replace(/\s*,?\s*\+\s*\d+\s*$/, '').trim();

    // Dump DOM TẤT CẢ creators để so sánh OK vs MISS
    const hasMiss = !detailData.gmv || !detailData.itemsSold || !detailData.revenueSource
      || !detailCategories || /Điểm|Chưa có điểm|Người theo dõi/.test(detailCategories);
    const prefix = hasMiss ? 'MISS_' : 'OK___';
    await dumpDomDebug(page, prefix + (username || cid), cid);

    // Map EN → VI cho categories và revenue source
    const enViMap: Record<string, string> = {
      'Womenswear & Underwear': 'Trang phục nữ & Đồ lót',
      'Menswear & Underwear': 'Trang phục nam & Đồ lót',
      'Sports & Outdoor': 'Thể thao & Ngoài trời',
      'Beauty & Personal Care': 'Chăm sóc sắc đẹp & Chăm sóc cá nhân',
      'Food & Beverages': 'Đồ ăn & Đồ uống',
      'Home Supplies': 'Đồ gia dụng',
      'Kitchenware': 'Đồ dùng nhà bếp',
      'Baby & Maternity': 'Trẻ sơ sinh & thai sản',
      'Fashion Accessories': 'Phụ kiện thời trang',
      'Phones & Electronics': 'Điện thoại & Đồ điện tử',
      'Health': 'Sức khỏe',
      'Kids Fashion': 'Thời trang trẻ em',
      'Shoes': 'Giày dép',
      'Bags & Luggage': 'Túi & Hành lý',
      'Home Appliances': 'Đồ gia dụng điện',
      'Pet Supplies': 'Đồ dùng thú cưng',
      'Toys & Hobbies': 'Đồ chơi & Sở thích',
      'Books, Magazines & Audio': 'Sách, Tạp chí & Âm thanh',
      'Textiles & Soft Furnishings': 'Dệt & Nội thất mềm',
      'Furniture': 'Nội thất',
      'Automotive': 'Ô tô & Xe máy',
      'product cards': 'Thẻ sản phẩm',
      'Product Cards': 'Thẻ sản phẩm',
      'Showcase': 'Trưng bày',
      'LIVE': 'LIVE',
      'Video': 'Video',
      'Other': 'Khác',
    };

    function mapEnVi(text: string): string {
      let result = text;
      for (const [en, vi] of Object.entries(enViMap)) {
        result = result.split(en).join(vi);
      }
      return result;
    }

    detailCategories = mapEnVi(detailCategories);
    const mappedRevenue = mapEnVi(detailData.revenueSource || '');

    return {
      bio, phone, zalo, whatsapp, email,
      detailFollowers,
      detailGmv: detailData.gmv || '',
      detailCategories,
      detailItemsSold: detailData.itemsSold || '',
      revenueSource: mappedRevenue,
    };
  } catch {
    return null;
  }
}
