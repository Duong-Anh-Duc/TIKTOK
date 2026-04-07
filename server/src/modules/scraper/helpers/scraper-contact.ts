/**
 * TikTok Scraper — Contact scraping helpers
 * Functions to scrape contact info (phone, zalo, whatsapp, email) from creator detail pages
 */
import { logger } from '../../../utils/logger';
import { solveCaptchaIfPresent, detectCaptcha } from '../../../utils/captcha-solver';
import { autoLoginIfNeeded } from './scraper-auth';
import { SHOP_ID } from '../../../constants';

/**
 * Cào contact info trong 1 tab cố định (navigate tới detail page)
 */
export async function scrapeContactInTab(
  page: any,
  cid: string,
  setCaptchaBlocked: (v: boolean) => void,
): Promise<{ bio: string; phone: string; zalo: string; whatsapp: string; email: string } | null> {
  try {
    let gotProfile = false;
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
      } catch {}
    };
    page.on('response', onResponse);

    const url = 'https://affiliate.tiktok.com/connection/creator/detail?cid=' + cid + '&shop_region=VN&shop_id=' + SHOP_ID;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);

    const loggedIn = await autoLoginIfNeeded(page);
    if (!loggedIn) { setCaptchaBlocked(true); page.removeListener('response', onResponse); return null; }
    if (page.url().includes('/account/login') === false && !page.url().includes('cid=' + cid)) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3000);
    }

    for (let captchaRound = 0; captchaRound < 3; captchaRound++) {
      const hasCaptcha = !!(await detectCaptcha(page));
      if (!hasCaptcha) break;

      logger.info('[Scraper] Captcha detected (round ' + (captchaRound + 1) + '), solving...');
      const solved = await solveCaptchaIfPresent(page);
      if (!solved) { setCaptchaBlocked(true); page.removeListener('response', onResponse); return null; }

      if (!gotProfile) {
        logger.info('[Scraper] Data chưa load → reload page...');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(3000);
      } else {
        logger.info('[Scraper] Data đã load, dismiss captcha xong → tiếp tục cào');
        await page.waitForTimeout(2000);
        break;
      }
    }

    const deadline = Date.now() + 10000;
    while (!gotProfile && Date.now() < deadline) {
      await page.waitForTimeout(500);
    }
    page.removeListener('response', onResponse);
    await page.waitForTimeout(1000);

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
            if (attempts > 10) { clearInterval(timer); resolve({ found: false, email: '', zalo: '', whatsapp: '' }); }
          }, 200);
        })
      `);
      if (result.found) {
        if (result.email && !email) email = result.email;
        if (result.zalo && !zalo) zalo = result.zalo;
        if (result.whatsapp && !whatsapp) whatsapp = result.whatsapp;
        break;
      }
      await page.waitForTimeout(500);
    }

    // Hover tooltip fallback for email
    if (!email && icons.length > 0) {
      for (const icon of icons.slice(0, 4)) {
        await page.mouse.move(icon.x, icon.y);
        await page.waitForTimeout(800);
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

    return { bio, phone, zalo, whatsapp, email };
  } catch {
    return null;
  }
}
