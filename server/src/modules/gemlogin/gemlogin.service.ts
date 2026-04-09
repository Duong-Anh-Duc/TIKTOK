import net from 'net';
import { logger } from '../../utils/logger';

/**
 * GemLoginService — tích hợp GemLogin anti-detect browser qua HTTP API.
 *
 * GemLogin chạy local trên máy, expose REST API (mặc định: http://localhost:7003).
 * Service này wrap các endpoint chính và tự inject CHROME_CDP_URL khi start profile
 * để TikTok Scraper tự dùng được qua CDP.
 *
 * Cấu hình .env:
 *   GEMLOGIN_API_URL   — base URL của GemLogin API (mặc định: http://localhost:7003)
 *   GEMLOGIN_PROFILE_ID — profile ID mặc định để start (tuỳ chọn)
 */

const DEFAULT_API_URL = 'http://localhost:7003';

function getApiUrl(): string {
  return (process.env.GEMLOGIN_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 30_000): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, opts);
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GemLogin API ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`GemLogin API ${method} ${path} → timeout sau ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

import type { BrowserVersion, Group, Profile, CreateProfilePayload, StartProfileResult } from '../../types';
export type { BrowserVersion, Group, Profile, CreateProfilePayload, StartProfileResult };

// ─── Service ──────────────────────────────────────────────────────────────────

export class GemLoginService {
  /** ID của profile đang được quản lý bởi service (nếu có) */
  private static activeProfileId: string | null = null;
  private static running = false;

  // ── Browser Versions ──────────────────────────────────────────────────────

  static getBrowserVersions(): Promise<BrowserVersion[]> {
    return request<BrowserVersion[]>('GET', '/api/browser_versions');
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  static getGroups(): Promise<Group[]> {
    return request<Group[]>('GET', '/api/groups');
  }

  // ── Profiles ──────────────────────────────────────────────────────────────

  static getProfiles(): Promise<Profile[]> {
    return request<Profile[]>('GET', '/api/profiles');
  }

  static getProfile(id: string): Promise<Profile> {
    return request<Profile>('GET', `/api/profile/${id}`);
  }

  static createProfile(payload: CreateProfilePayload): Promise<Profile> {
    return request<Profile>('POST', '/api/profiles/create', payload);
  }

  static updateProfile(profileId: string, payload: Partial<CreateProfilePayload>): Promise<Profile> {
    return request<Profile>('POST', `/api/profiles/update/${profileId}`, payload);
  }

  static deleteProfile(id: string): Promise<unknown> {
    return request<unknown>('GET', `/api/profiles/delete/${id}`);
  }

  static changeFingerprint(ids?: string[]): Promise<unknown> {
    const query = ids?.length ? `?ids=${ids.join(',')}` : '';
    return request<unknown>('GET', `/api/profiles/changeFingerprint${query}`);
  }

  // ── Start / Close browser ─────────────────────────────────────────────────

  /**
   * Detect if running inside Docker (container can't reach host via 127.0.0.1).
   */
  private static isDocker(): boolean {
    return !!process.env.GEMLOGIN_API_URL?.includes('host.docker.internal');
  }

  /**
   * Replace 127.0.0.1 with host.docker.internal when running in Docker.
   */
  private static resolveHost(address: string): string {
    if (this.isDocker()) {
      return address.replace(/127\.0\.0\.1|localhost/g, 'host.docker.internal');
    }
    return address;
  }

  /**
   * CDP Relay ports — relay chạy trên Windows host (node cdp-relay.js).
   */
  private static readonly RELAY_CDP_PORT = 19222;
  private static readonly RELAY_CONTROL_PORT = 19223;

  /**
   * Gọi CDP Relay control API để cập nhật target port.
   */
  private static async setRelayTarget(port: number): Promise<boolean> {
    const relayUrl = `http://host.docker.internal:${this.RELAY_CONTROL_PORT}/set?port=${port}`;
    try {
      const res = await fetch(relayUrl, { method: 'POST', signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        logger.info(`[GemLogin] Relay target cập nhật: 127.0.0.1:${port}`);
        return true;
      }
      logger.warn(`[GemLogin] Relay trả về ${res.status}`);
      return false;
    } catch (err: any) {
      logger.warn(`[GemLogin] Không thể kết nối Relay: ${err.message}. Đảm bảo đã chạy "node cdp-relay.js" trên Windows.`);
      return false;
    }
  }

  /**
   * Trích xuất port từ remote_debugging_address (ví dụ: "127.0.0.1:53624" → 53624).
   */
  private static extractPort(addr: string): number {
    const match = addr.match(/:(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private static starting = false;

  /**
   * Chờ CDP sẵn sàng từ remote_debugging_address trả về bởi GemLogin API.
   */
  private static async waitForCdpFromAddr(addr: string): Promise<string | null> {
    if (this.isDocker()) {
      const chromePort = this.extractPort(addr);
      if (chromePort > 0) {
        const relayOk = await this.setRelayTarget(chromePort);
        if (relayOk) {
          const relayUrl = `http://host.docker.internal:${this.RELAY_CDP_PORT}`;
          const deadline = Date.now() + 30_000;
          while (Date.now() < deadline) {
            try {
              const r = await fetch(`${relayUrl}/json/version`, { signal: AbortSignal.timeout(2000) });
              if (r.ok) { logger.info(`[GemLogin] Relay OK: ${relayUrl}`); return relayUrl; }
            } catch {}
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
      // Fallback trực tiếp
      const resolved = this.resolveHost(addr);
      const testUrl = `http://${resolved}`;
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        try {
          const r = await fetch(`${testUrl}/json/version`, { signal: AbortSignal.timeout(2000) });
          if (r.ok) return testUrl;
        } catch {}
        await new Promise(r => setTimeout(r, 2000));
      }
      return null;
    }

    // Ngoài Docker
    const directUrl = `http://${addr}`;
    logger.info(`[GemLogin] Thử kết nối: ${directUrl}`);
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        const r = await fetch(`${directUrl}/json/version`, { signal: AbortSignal.timeout(2000) });
        if (r.ok) {
          const j = await r.json() as any;
          if (j?.webSocketDebuggerUrl) { logger.info(`[GemLogin] CDP OK: ${directUrl}`); return directUrl; }
        }
      } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }
    return null;
  }

  /**
   * Kiểm tra CDP URL có còn sống không.
   */
  private static async isCdpAlive(url: string): Promise<boolean> {
    try {
      const r = await fetch(`${url}/json/version`, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) return false;
      const j = await r.json() as any;
      return !!j?.webSocketDebuggerUrl;
    } catch {
      return false;
    }
  }

  static async startProfile(profileId: string): Promise<StartProfileResult> {
    // Nếu đã chạy và CDP còn sống, trả về ngay
    if (this.running && process.env.CHROME_CDP_URL) {
      if (await this.isCdpAlive(process.env.CHROME_CDP_URL)) {
        logger.info(`[GemLogin] Profile đã chạy, CDP OK: ${process.env.CHROME_CDP_URL}`);
        return { wsUrl: process.env.CHROME_CDP_URL, cdpUrl: process.env.CHROME_CDP_URL, profileId: this.activeProfileId || profileId };
      }
      // CDP chết → reset state
      logger.warn(`[GemLogin] CDP cũ không còn sống, khởi động lại...`);
      this.running = false;
      this.activeProfileId = null;
      process.env.CHROME_CDP_URL = '';
    }

    // Chống gọi đồng thời
    if (this.starting) {
      throw new Error('gemlogin.startInProgress');
    }
    this.starting = true;

    try {
      let cdpUrl: string | null = null;
      logger.info(`[GemLogin] Gửi lệnh khởi động profile: ${profileId}`);

      for (let attempt = 1; attempt <= 3 && !cdpUrl; attempt++) {
        try {
          if (attempt > 1) {
            // Close profile trước khi retry
            logger.info(`[GemLogin] Lần ${attempt}: close profile trước khi retry...`);
            await request<any>('GET', `/api/profiles/close/${profileId}`, undefined, 10_000).catch(() => {});
            await new Promise(r => setTimeout(r, 3000));
          }

          const raw = await request<any>('GET', `/api/profiles/start/${profileId}`, undefined, 60_000);
          logger.info(`[GemLogin] Start API lần ${attempt}: ${JSON.stringify(raw)}`);
          const addr: string = raw?.data?.remote_debugging_address || raw?.remote_debugging_address || '';
          if (addr) {
            cdpUrl = await this.waitForCdpFromAddr(addr);
            if (!cdpUrl) {
              logger.warn(`[GemLogin] Lần ${attempt}: Start OK nhưng CDP không phản hồi (addr=${addr})`);
            }
          } else {
            logger.warn(`[GemLogin] Lần ${attempt}: Start OK nhưng không có remote_debugging_address`);
          }
        } catch (err: any) {
          logger.warn(`[GemLogin] Lần ${attempt} lỗi: ${err.message}`);
        }
      }

      if (!cdpUrl) {
        throw new Error('gemlogin.cdpNotFound');
      }

      this.activeProfileId = profileId;
      this.running = true;
      process.env.CHROME_CDP_URL = cdpUrl;

      logger.info(`[GemLogin] Profile ${profileId} sẵn sàng. CDP: ${cdpUrl}`);
      return { wsUrl: cdpUrl, cdpUrl, profileId };
    } finally {
      this.starting = false;
    }
  }

  /**
   * Scan tất cả port 1024–65000 trên CẢ IPv4 (127.0.0.1) VÀ IPv6 (::1).
   */
  private static async discoverCdp(timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    const OWN_PORT = parseInt(process.env.PORT || '5000', 10);

    const tcpOpen = (host: string, port: number): Promise<boolean> =>
      new Promise(resolve => {
        const s = net.createConnection({ host, port });
        const t = setTimeout(() => { s.destroy(); resolve(false); }, 80);
        s.on('connect', () => { clearTimeout(t); s.destroy(); resolve(true); });
        s.on('error', () => { clearTimeout(t); resolve(false); });
      });

    const cdpCheck = async (host: string, port: number): Promise<string | null> => {
      const h = host.includes(':') ? `[${host}]` : host;
      try {
        const r = await fetch(`http://${h}:${port}/json/version`, {
          signal: AbortSignal.timeout(500),
        });
        if (r.ok) {
          const j = await r.json() as any;
          if (j?.webSocketDebuggerUrl) {
            return `http://${h}:${port}`;
          }
          if (j?.Browser) {
            logger.warn(`[GemLogin] Port ${port} has /json/version (Browser: ${j.Browser}) but no webSocketDebuggerUrl — skipping`);
          }
        }
      } catch { /* not CDP */ }
      return null;
    };

    // Khi chạy trong Docker, kiểm tra relay port trước
    if (this.isDocker()) {
      const relayUrl = await cdpCheck('host.docker.internal', this.RELAY_CDP_PORT);
      if (relayUrl) {
        logger.info(`[GemLogin] CDP found qua relay: ${relayUrl}`);
        return relayUrl;
      }
    }

    const scanHosts = this.isDocker() ? ['host.docker.internal'] : ['127.0.0.1', '::1'];

    while (Date.now() < deadline) {
      for (const host of scanHosts) {
        const openPorts: number[] = [];
        for (let start = 1024; start <= 65535 && Date.now() < deadline; start += 2000) {
          const batch = Array.from({ length: Math.min(2000, 65536 - start) }, (_, i) => start + i);
          const hits = await Promise.all(batch.map(async p => (await tcpOpen(host, p)) ? p : null));
          openPorts.push(...hits.filter((p): p is number => p !== null));
        }
        const display = openPorts.filter(p => p !== OWN_PORT);
        logger.info(`[GemLogin] ${host}: ${openPorts.length} port mở: [${display.slice(0, 30).join(', ')}${display.length > 30 ? '...' : ''}]`);

        for (const port of openPorts.filter(p => p !== OWN_PORT)) {
          const url = await cdpCheck(host, port);
          if (url) {
            logger.info(`[GemLogin] CDP found: ${url}`);
            return url;
          }
        }
      }

      const timeLeft = Math.round((deadline - Date.now()) / 1000);
      logger.info(`[GemLogin] CDP không tìm thấy trên IPv4/IPv6, thử lại sau 3s (còn ${timeLeft}s)...`);
      await new Promise(r => setTimeout(r, 3000));
    }

    throw new Error('gemlogin.cdpNotFoundScan');
  }

  /**
   * Đóng browser instance đang chạy và xoá CHROME_CDP_URL.
   */
  static async closeProfile(profileId?: string): Promise<void> {
    const id = profileId || this.activeProfileId;
    if (!id) {
      throw new Error('gemlogin.noProfileRunning');
    }

    logger.info(`[GemLogin] Đóng profile: ${id}`);

    await request<unknown>('GET', `/api/profiles/close/${id}`);

    if (this.activeProfileId === id) {
      process.env.CHROME_CDP_URL = '';
      this.activeProfileId = null;
      this.running = false;
    }

    logger.info(`[GemLogin] Profile ${id} đã đóng`);
  }

  // ── Reconnect (khi CDP bị mất giữa chừng) ────────────────────────────────

  static async reconnect(): Promise<string> {
    logger.info(`[GemLogin] Reconnect — scan CDP port...`);

    const cdpUrl = await GemLoginService.discoverCdp(60_000);
    process.env.CHROME_CDP_URL = cdpUrl;
    this.running = true;
    this.activeProfileId = this.activeProfileId || process.env.GEMLOGIN_PROFILE_ID || '1';

    logger.info(`[GemLogin] Reconnected. CDP mới: ${cdpUrl}`);
    return cdpUrl;
  }

  /**
   * Đảm bảo GemLogin đang chạy trước khi cào.
   */
  static async ensureRunning(onStarting?: () => void): Promise<void> {
    if (this.running) return;
    onStarting?.();
    const profileId = process.env.GEMLOGIN_PROFILE_ID || '1';
    await this.startProfile(profileId);
  }

  // ── Status ────────────────────────────────────────────────────────────────

  static getStatus() {
    return {
      isRunning: this.running,
      activeProfileId: this.activeProfileId,
      apiUrl: getApiUrl(),
      cdpInjected: this.running && !!process.env.CHROME_CDP_URL,
    };
  }
}
