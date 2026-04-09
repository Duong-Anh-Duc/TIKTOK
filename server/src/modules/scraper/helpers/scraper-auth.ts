/**
 * TikTok Scraper — Auth helpers (auto-login, CDP connection, test login)
 */
import { logger } from '../../../utils/logger';
import { solveCaptchaIfPresent } from '../../../utils/captcha-solver';
import { handleEmailVerification, getExistingMessageIds } from '../../../utils/email-verifier';
import { SHOP_ID, SHOP_REGION } from '../../../constants';

/**
 * Tự động đăng nhập TikTok Shop nếu đang ở trang login
 */
export async function autoLoginIfNeeded(page: any, onProgress?: (scraped: number, total: number, message: string) => void): Promise<boolean> {
  const url = page.url();
  const isLoginPage = url.includes('/account/login')
    || url.includes('/login/choose-region')
    || url.includes('seller.tiktok.com/login')
    || url.includes('seller-vn.tiktok.com/login')
    || url.includes('/passport/')
    || url.includes('needLogin=1');
  if (!isLoginPage) return true;

  const email = process.env.TIKTOK_EMAIL;
  const phone = process.env.TIKTOK_PHONE;
  const password = process.env.TIKTOK_PASSWORD;
  const useEmail = !!email;

  if (!password || (!email && !phone)) {
    logger.warn('[Scraper] Gặp trang login nhưng chưa cấu hình TIKTOK_EMAIL hoặc TIKTOK_PHONE + TIKTOK_PASSWORD');
    onProgress?.(0, 0, 'Chưa cấu hình thông tin đăng nhập TikTok');
    return false;
  }

  onProgress?.(0, 0, `Đang đăng nhập TikTok Shop bằng ${useEmail ? 'email' : 'SĐT'}...`);
  logger.info(`[Scraper] Tự động đăng nhập TikTok Shop bằng ${useEmail ? 'email' : 'SĐT'}...`);

  const fs = await import('fs');
  const pathMod = await import('path');
  const ssDir = pathMod.resolve(__dirname, '..', '..', '..', '..', 'data');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
  let ssStep = 0;
  const ss = async (name: string) => {
    try {
      ssStep++;
      const p = pathMod.resolve(ssDir, `login-step-${String(ssStep).padStart(2,'0')}-${name}.png`);
      await page.screenshot({ path: p, fullPage: false });
      logger.info(`[Scraper] 📸 ${p}`);
    } catch {}
  };

  try {
    await page.waitForTimeout(3000);
    await ss('page-loaded');

    if (page.url().includes('/login/choose-region') || (!page.url().includes('/account/login') && !page.url().includes('/passport/'))) {
      logger.info('[Scraper] Chưa ở form login, navigate thẳng tới trang login...');
      await page.goto('https://seller-vn.tiktok.com/account/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(5000);
      logger.info(`[Scraper] URL sau navigate: ${page.url()}`);
      await ss('after-navigate');
    }

    const inputs = await page.evaluate(`
      Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type, name: i.name, placeholder: i.placeholder, id: i.id,
        class: i.className.slice(0, 50), visible: i.offsetParent !== null
      }))
    `).catch(() => []);
    logger.info(`[Scraper] Inputs trên trang: ${JSON.stringify(inputs)}`);

    const buttons = await page.evaluate(`
      Array.from(document.querySelectorAll('button, [role="button"]')).map(b => ({
        text: b.textContent.trim().slice(0, 50), type: b.type, class: b.className.slice(0, 50)
      }))
    `).catch(() => []);
    logger.info(`[Scraper] Buttons trên trang: ${JSON.stringify(buttons)}`);

    const tabs = await page.evaluate(`
      Array.from(document.querySelectorAll('[role="tab"], a, div, span')).filter(el => {
        var text = el.textContent.trim();
        return text === 'Email' || text === 'Phone' || text === 'Điện thoại' || text === 'SĐT';
      }).map(el => ({
        tag: el.tagName, text: el.textContent.trim().slice(0, 30), role: el.getAttribute('role'),
        class: el.className.toString().slice(0, 50)
      }))
    `).catch(() => []);
    logger.info(`[Scraper] Tabs: ${JSON.stringify(tabs)}`);

    if (useEmail) {
      const clicked = await page.evaluate(`
        (function() {
          var all = document.querySelectorAll('*');
          for (var el of all) {
            var text = (el.textContent || '').trim();
            var children = el.children.length;
            if (children <= 2 && (text === 'Đăng nhập bằng email' || text === 'Log in with email')) {
              console.log('Found email link:', el.tagName, el.className);
              el.click();
              return true;
            }
          }
          return false;
        })()
      `).catch(() => false);
      logger.info(`[Scraper] Click "Đăng nhập bằng email": ${clicked}`);
      await page.waitForTimeout(2000);
      await ss('after-email-link');

      if (!clicked) {
        logger.warn('[Scraper] Không tìm thấy link "Đăng nhập bằng email"');
      }

      await page.evaluate(`
        (function() {
          var input = document.getElementById('TikTok_Ads_SSO_Login_Email_Input')
            || document.querySelector('input[name="email"]')
            || document.querySelector('input[placeholder="Địa chỉ email"]');
          if (!input) { console.log('EMAIL INPUT NOT FOUND'); return; }
          var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, '${email}');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Email set OK');
        })()
      `);
      await page.waitForTimeout(500);
      logger.info(`[Scraper] Đã nhập email: ${email}`);
      await ss('after-email-input');
    } else {
      const phoneNumber = phone!.startsWith('0') ? phone!.slice(1) : phone!;
      const phoneInput = await page.locator('input[placeholder*="điện thoại"], input[placeholder*="phone"], input[type="tel"]').first();
      await phoneInput.click();
      await phoneInput.fill(phoneNumber);
      await page.waitForTimeout(500);
    }

    await page.evaluate(`
      (function() {
        var input = document.getElementById('TikTok_Ads_SSO_Login_Pwd_Input')
          || document.querySelector('input[name="password"]')
          || document.querySelector('input[type="password"]');
        if (!input) { console.log('PASSWORD INPUT NOT FOUND'); return; }
        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, '${password}');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Password set OK');
      })()
    `);
    await page.waitForTimeout(500);
    logger.info('[Scraper] Đã nhập mật khẩu');
    await ss('after-password');

    const hasMailTm = !!(process.env.MAILTM_ADDRESS && process.env.MAILTM_PASSWORD);
    const preLoginEmailIds = hasMailTm
      ? await getExistingMessageIds().catch(() => new Set<string>())
      : new Set<string>();

    await page.evaluate(`
      (function() {
        var btns = document.querySelectorAll('button');
        for (var btn of btns) {
          var text = btn.textContent.trim();
          if (text === 'Đăng nhập' || text === 'Log In' || text === 'Log in') {
            btn.click();
            console.log('Login button clicked:', text);
            return;
          }
        }
        var form = document.querySelector('form');
        if (form) form.submit();
      })()
    `);
    logger.info('[Scraper] Đã bấm nút Đăng nhập');
    onProgress?.(0, 0, 'Đã nhập thông tin, đang đăng nhập...');

    logger.info('[Scraper] Đã bấm đăng nhập, đợi chuyển trang...');
    await page.waitForTimeout(5000);
    await ss('after-login-click');

    onProgress?.(0, 0, 'Đang giải captcha...');
    const solved = await solveCaptchaIfPresent(page);
    if (!solved) {
      logger.warn('[Scraper] Captcha sau login không giải được');
      onProgress?.(0, 0, 'Giải captcha thất bại');
      return false;
    }

    await page.waitForTimeout(3000);
    await ss('after-captcha');

    if (hasMailTm) {
      onProgress?.(0, 0, 'Đang xác minh email...');
      const verified = await handleEmailVerification(page, preLoginEmailIds);
      if (verified) {
        logger.info('[Scraper] Đã xác minh email thành công');
        await page.waitForTimeout(3000);
      }
    }

    const currentUrl = page.url();
    if (currentUrl.includes('/account/login')) {
      logger.warn('[Scraper] Vẫn ở trang login — đăng nhập thất bại');
      onProgress?.(0, 0, 'Đăng nhập TikTok thất bại');
      return false;
    }

    logger.info('[Scraper] Đăng nhập TikTok thành công!');
    onProgress?.(0, 0, 'Đăng nhập TikTok thành công!');
    return true;
  } catch (err: any) {
    logger.error('[Scraper] Lỗi auto-login: ' + err.message);
    return false;
  }
}

/**
 * Test login riêng
 */
export async function testAutoLogin(): Promise<{ success: boolean; message: string; url?: string; screenshot?: string }> {
  const fs = await import('fs');
  const pathMod = await import('path');
  const browser = await connectCDP();
  const ctx = browser.contexts()[0] || await browser.newContext();
  const page = await ctx.newPage();
  const screenshotDir = pathMod.resolve(__dirname, '..', '..', '..', '..', 'data');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const saveScreenshot = async (name: string) => {
    const p = pathMod.resolve(screenshotDir, `test-login-${name}.png`);
    await page.screenshot({ path: p, fullPage: false }).catch(() => {});
    return `/api/scraper/screenshots/test-login-${name}.png`;
  };

  try {
    await page.goto('https://affiliate.tiktok.com/connection/creator?shop_region=' + SHOP_REGION + '&shop_id=' + SHOP_ID, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForTimeout(5000);
    await saveScreenshot('01-initial');

    const currentUrl = page.url();
    const needsLogin = currentUrl.includes('/account/login')
      || currentUrl.includes('/login/choose-region')
      || currentUrl.includes('/passport/')
      || currentUrl.includes('needLogin=1');
    if (needsLogin) {
      logger.info('[Scraper] Test login: đang ở trang login, thử auto-login...');
      const ok = await autoLoginIfNeeded(page);
      const finalUrl = page.url();
      const ssPath = await saveScreenshot('02-after-login');
      if (ok) {
        return { success: true, message: 'scraper.testLoginSuccess', url: finalUrl, screenshot: ssPath };
      } else {
        return { success: false, message: 'scraper.testLoginFailed', url: finalUrl, screenshot: ssPath };
      }
    } else {
      return { success: true, message: 'scraper.alreadyLoggedIn', url: currentUrl };
    }
  } catch (err: any) {
    await saveScreenshot('error');
    logger.error('[Scraper] Test login error: ' + err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Verify CDP URL còn hoạt động không
 */
export async function isCdpAlive(url: string): Promise<boolean> {
  try {
    const res = await fetch(url + '/json/version', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

/**
 * Connect CDP: verify port trước → nếu fail thì re-discover CDP port mới
 */
export async function connectCDP() {
  const { chromium } = await import('playwright');
  let cdpUrl = process.env.CHROME_CDP_URL;

  if (cdpUrl && !(await isCdpAlive(cdpUrl))) {
    logger.warn(`[Scraper] CDP ${cdpUrl} không phản hồi, re-discover...`);
    cdpUrl = null as any;
  }

  if (!cdpUrl) {
    const { GemLoginService } = await import('../../gemlogin/gemlogin.service');
    const profileId = process.env.GEMLOGIN_PROFILE_ID || '1';
    const result = await GemLoginService.startProfile(profileId);
    cdpUrl = result.cdpUrl;
    logger.info(`[Scraper] CDP mới: ${cdpUrl}`);
  }

  const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 15000 });

  try {
    const ctx = browser.contexts()[0];
    if (ctx) {
      const pages = ctx.pages();
      if (pages.length > 0) {
        const cdpSession = await pages[0].context().newCDPSession(pages[0]);
        const { windowId } = await cdpSession.send('Browser.getWindowForTarget') as any;
        await cdpSession.send('Browser.setWindowBounds', {
          windowId,
          bounds: { windowState: 'minimized' },
        });
        logger.info('[Scraper] Browser window minimized');
      }
    }
  } catch (e: any) {
    logger.warn(`[Scraper] Không thể minimize: ${e.message}`);
  }

  return browser;
}

export function humanDelay(): number {
  return 2000 + Math.floor(Math.random() * 2000);
}
