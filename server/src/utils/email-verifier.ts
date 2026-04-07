/**
 * Mail.tm Email Verifier — lấy mã xác minh TikTok từ temp mail
 * API docs: https://docs.mail.tm/
 */
import dotenv from 'dotenv';
dotenv.config();

import type { MailTmMessage } from '../types';
import { MAILTM_API } from '../constants';

/** Lấy token đăng nhập mail.tm */
async function getMailTmToken(): Promise<string> {
  const address = process.env.MAILTM_ADDRESS;
  const password = process.env.MAILTM_PASSWORD;

  if (!address || !password) {
    throw new Error('emailVerifier.mailtmNotConfigured');
  }

  const res = await fetch(`${MAILTM_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mail.tm login failed (${res.status}): ${text}`);
  }

  const data = await res.json() as any;
  return data.token;
}

/** Lấy danh sách messages mới nhất */
async function getMessages(token: string): Promise<MailTmMessage[]> {
  const res = await fetch(`${MAILTM_API}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Fetch messages failed: ${res.status}`);
  }

  const data = await res.json() as any;
  return data['hydra:member'] || [];
}

/** Trích xuất mã xác minh 6 số từ text */
function extractCode(text: string): string | null {
  const match = text.match(/(\d{6})/);
  return match ? match[1] : null;
}

/**
 * Đợi và lấy mã xác minh TikTok từ mail.tm
 * Cách hoạt động:
 * 1. Ghi nhận ID các email cũ trước khi gửi mã
 * 2. Poll cho tới khi có email MỚI từ TikTok (ID chưa từng thấy)
 * 3. Trích mã 6 số từ subject hoặc intro
 */
export async function waitForVerificationCode(
  timeoutMs = 90000,
  existingIds?: Set<string>,
): Promise<string> {
  console.log('  📧 Đăng nhập mail.tm...');
  const token = await getMailTmToken();
  console.log('  ✅ Mail.tm token OK');

  const knownIds = existingIds || new Set<string>();
  const startTime = Date.now();

  console.log(`  ⏳ Chờ email TikTok mới (tối đa ${timeoutMs / 1000}s, đã biết ${knownIds.size} email cũ)...`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      const messages = await getMessages(token);

      for (const msg of messages) {
        // Bỏ qua email đã biết trước đó
        if (knownIds.has(msg.id)) continue;

        // Chỉ lấy email từ TikTok (register@account.tiktok.com)
        const fromAddr = msg.from?.address?.toLowerCase() || '';
        if (!fromAddr.includes('tiktok')) continue;

        // Trích mã từ subject (VD: "789678 là mã xác minh của bạn")
        const code = extractCode(msg.subject) || extractCode(msg.intro || '');
        if (code) {
          console.log(`  📩 Email: ${msg.subject}`);
          console.log(`  ✅ Mã xác minh: ${code}`);
          return code;
        }
      }
    } catch (err: any) {
      console.log(`  ⚠️ Lỗi poll: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  throw new Error('emailVerifier.verificationTimeout');
}

/** Lấy danh sách ID email hiện có (để sau so sánh tìm email mới) */
export async function getExistingMessageIds(): Promise<Set<string>> {
  try {
    const token = await getMailTmToken();
    const messages = await getMessages(token);
    const ids = new Set(messages.map(m => m.id));
    console.log(`  📧 Đã ghi nhận ${ids.size} email cũ`);
    return ids;
  } catch (err: any) {
    console.log(`  ⚠️ Không lấy được email cũ: ${err.message}`);
    return new Set();
  }
}

/**
 * Xử lý trang xác minh email trên TikTok
 * Flow: Bấm "Gửi mã" → Đợi email mới → Nhập mã → Đăng nhập
 * @param preLoginIds ID email đã ghi nhận TRƯỚC khi login (để phân biệt email mới)
 */
export async function handleEmailVerification(page: any, preLoginIds?: Set<string>): Promise<boolean> {
  // Detect trang xác minh
  const isVerifyPage = await page.evaluate(`
    (function() {
      var text = document.body.innerText || '';
      return text.indexOf('mã xác minh') >= 0
        || text.indexOf('verification code') >= 0
        || text.indexOf('Nhập mã xác minh') >= 0;
    })()
  `).catch(() => false);

  if (!isVerifyPage) return false;

  console.log('  📧 Phát hiện trang xác minh email!');

  // Dùng IDs đã ghi nhận trước login, hoặc lấy mới nếu không có
  const existingIds = preLoginIds || await getExistingMessageIds();

  // 2. Bấm "Gửi mã"
  console.log('  Bấm "Gửi mã"...');
  await page.evaluate(`
    (function() {
      var all = document.querySelectorAll('*');
      for (var el of all) {
        var text = el.textContent.trim();
        var children = el.children.length;
        if (children <= 1 && (text === 'Gửi mã' || text === 'Send code' || text === 'Get code')) {
          el.click();
          return true;
        }
      }
      return false;
    })()
  `);
  await page.waitForTimeout(3000);

  // 3. Lấy mã từ mail.tm (chờ email MỚI)
  try {
    const code = await waitForVerificationCode(90000, existingIds);

    // 4. Nhập mã vào ô input — tìm input VISIBLE có id hoặc placeholder liên quan mã xác minh
    console.log(`  Nhập mã: ${code}`);
    await page.evaluate(`
      (function() {
        // Ưu tiên: input cụ thể của TikTok SSO
        var input = document.getElementById('TikTok_Ads_SSO_Login_Code_Input');
        if (!input || input.offsetParent === null) {
          // Fallback: tìm input visible có placeholder chứa "mã xác minh" hoặc name="code"
          var candidates = document.querySelectorAll('input[name="code"], input[placeholder*="mã xác minh"], input[placeholder*="Nhập mã"], input[placeholder*="verification"], input[placeholder*="code"]');
          for (var c of candidates) {
            if (c.offsetParent !== null) { input = c; break; }
          }
        }
        if (!input || input.offsetParent === null) {
          // Last fallback: bất kỳ input visible nào
          var all = document.querySelectorAll('input');
          for (var a of all) {
            var r = a.getBoundingClientRect();
            if (r.width > 100 && r.height > 20 && a.offsetParent !== null) { input = a; break; }
          }
        }
        if (!input) { console.log('INPUT NOT FOUND'); return; }
        console.log('Found input:', input.id, input.placeholder);
        input.focus();
        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '${code}');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Code filled OK');
      })()
    `);
    await page.waitForTimeout(1000);

    // 5. Bấm "Đăng nhập"
    console.log('  Bấm "Đăng nhập"...');
    await page.evaluate(`
      (function() {
        var btns = document.querySelectorAll('button');
        for (var btn of btns) {
          var text = btn.textContent.trim();
          if (text === 'Đăng nhập' || text === 'Log In' || text === 'Log in' || text === 'Submit') {
            btn.click(); return true;
          }
        }
        return false;
      })()
    `);
    await page.waitForTimeout(5000);

    return true;
  } catch (err: any) {
    console.log(`  ❌ Lỗi xác minh email: ${err.message}`);
    return false;
  }
}
