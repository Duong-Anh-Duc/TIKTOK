/**
 * TikTok Scraper Service — Main orchestration
 * Helpers split into: scraper-auth, scraper-contact, scraper-excel, scraper-filters
 */
import { logger } from '../../utils/logger';
import { autoLoginIfNeeded, connectCDP } from './helpers/scraper-auth';
import { scrapeContactInTab } from './helpers/scraper-contact';
import { saveXlsx } from './helpers/scraper-excel';
import { applyAllFilters } from './helpers/scraper-filters';

export { testAutoLogin } from './helpers/scraper-auth';

import type { CreatorInfo } from '../../types';
import { SHOP_ID, CONCURRENT_TABS, MAX_CAPTCHA_FAILS } from '../../constants';

export class TikTokScraperService {
  private static filteredPage: any = null;
  private static filteredCreators: CreatorInfo[] = [];

  /**
   * Test filter: mở list page → áp dụng filters → user xem browser
   */
  static async testFilter(
    categories: string[][] = [],
    contentType: string = '',
    gmv: string[] = [],
    itemsSold: string[] = [],
    liveViewerMin: number = 0,
  ) {
    const browser = await connectCDP();
    const ctx = browser.contexts()[0] || await browser.newContext();
    const page = await ctx.newPage();

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    // Listener: bắt marketplace/find API
    page.on('response', async (resp: any) => {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        if (!resp.url().includes('/creator/marketplace/find')) return;
        const json = await resp.json().catch(() => null);
        if (!json?.creator_profile_list) return;
        this.filteredCreators = [];
        for (const item of json.creator_profile_list) {
          const oecuid = item.creator_oecuid?.value || '';
          if (oecuid) {
            this.filteredCreators.push({
              oecuid,
              handle: item.handle?.value || '',
              nickname: item.nickname?.value || '',
              followers: item.follower_cnt?.value || '',
              gmv: item.gmv_level?.value || item.gmv?.value || '',
              categories: (item.content_category_list || []).map((c: any) => c.value || c.name || c).join(', '),
              items_sold: item.items_sold_range?.value || item.items_sold?.value || '',
              content_type: item.content_type_label?.value || item.content_type?.value || '',
            });
          }
        }
        logger.info('[Scraper] Filter API: ' + this.filteredCreators.length + ' creators');
      } catch {}
    });

    await page.goto(
      `https://affiliate.tiktok.com/connection/creator?shop_region=VN&shop_id=${SHOP_ID}`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(5000);

    const loggedIn = await autoLoginIfNeeded(page);
    if (!loggedIn) {
      throw new Error('scraper.loginRequiredButFailed');
    }
    if (!page.url().includes('affiliate.tiktok.com/connection/creator')) {
      await page.goto(
        `https://affiliate.tiktok.com/connection/creator?shop_region=VN&shop_id=${SHOP_ID}`,
        { waitUntil: 'domcontentloaded', timeout: 30000 }
      );
      await page.waitForTimeout(5000);
    }

    await applyAllFilters(page, categories, contentType, gmv, itemsSold, liveViewerMin);
    await page.waitForTimeout(5000);
    logger.info('[Scraper] Test filter done — lưu ' + this.filteredCreators.length + ' creators để cào');

    this.filteredPage = page;
  }

  /**
   * Cào creators: API-first approach
   */
  static async scrapeCreators(
    minCreators: number = 0,
    categories: string[][] = [],
    contentType: string = '',
    gmv: string[] = [],
    itemsSold: string[] = [],
    liveViewerMin: number = 0,
    onProgress?: (scraped: number, total: number, message: string) => void,
  ) {
    const browser = await connectCDP();
    const ctx = browser.contexts()[0] || await browser.newContext();

    const creatorQueue: CreatorInfo[] = [];
    const seenOecuids = new Set<string>();
    const results: any[] = [];
    let captchaBlocked = false;
    let apiHasMore = true;
    const hasFilters = categories.length > 0 || contentType || gmv.length > 0 || itemsSold.length > 0 || liveViewerMin > 0;

    const marketplaceListener = async (resp: any) => {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        if (!resp.url().includes('/creator/marketplace/find')) return;
        const json = await resp.json().catch(() => null);
        if (!json?.creator_profile_list) return;

        const list = json.creator_profile_list;
        for (const item of list) {
          const oecuid = item.creator_oecuid?.value || '';
          if (oecuid && !seenOecuids.has(oecuid)) {
            seenOecuids.add(oecuid);
            creatorQueue.push({
              oecuid,
              handle: item.handle?.value || '',
              nickname: item.nickname?.value || '',
              followers: item.follower_cnt?.value || '',
              gmv: item.gmv_level?.value || item.gmv?.value || '',
              categories: (item.content_category_list || []).map((c: any) => c.value || c.name || c).join(', '),
              items_sold: item.items_sold_range?.value || item.items_sold?.value || '',
              content_type: item.content_type_label?.value || item.content_type?.value || '',
            });
          }
        }
        apiHasMore = json.next_pagination?.has_more ?? false;
        logger.info('[Scraper] API: +' + list.length + ' creators | queue=' + creatorQueue.length + ' | has_more=' + apiHasMore);
      } catch {}
    };

    const reuseFiltered = !!this.filteredPage;
    let listPage: any;

    if (reuseFiltered) {
      listPage = this.filteredPage;
      this.filteredPage = null;
      logger.info('[Scraper] Dùng lại tab đã filter từ testFilter()');
      onProgress?.(0, 0, 'Dùng lại trang đã lọc...');
      listPage.on('response', marketplaceListener);
      for (const c of this.filteredCreators) {
        if (!seenOecuids.has(c.oecuid)) {
          seenOecuids.add(c.oecuid);
          creatorQueue.push(c);
        }
      }
      this.filteredCreators = [];
      logger.info('[Scraper] Đã nạp ' + creatorQueue.length + ' creators từ bộ lọc');
    } else {
      listPage = await ctx.newPage();
      const listCdp = await listPage.context().newCDPSession(listPage);
      await listCdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      listPage.on('response', marketplaceListener);

      logger.info('[Scraper] Mở trang Tìm nhà sáng tạo');
      onProgress?.(0, 0, 'Đang mở trang...');

      await listPage.goto(
        'https://affiliate.tiktok.com/connection/creator?shop_region=VN&shop_id=' + SHOP_ID,
        { waitUntil: 'domcontentloaded', timeout: 30000 }
      );
      await listPage.waitForTimeout(5000);

      const loggedIn = await autoLoginIfNeeded(listPage, onProgress);
      if (!loggedIn) {
        throw new Error('scraper.loginRequiredButFailed');
      }
      if (!listPage.url().includes('affiliate.tiktok.com/connection/creator')) {
        await listPage.goto(
          'https://affiliate.tiktok.com/connection/creator?shop_region=VN&shop_id=' + SHOP_ID,
          { waitUntil: 'domcontentloaded', timeout: 30000 }
        );
        await listPage.waitForTimeout(5000);
      }

      if (hasFilters) {
        onProgress?.(0, 0, 'Đang áp dụng bộ lọc...');
        await applyAllFilters(listPage, categories, contentType, gmv, itemsSold, liveViewerMin);
        await listPage.waitForTimeout(3000);
      }
    }

    // Phase 1: Scroll to collect creators
    onProgress?.(0, creatorQueue.length, 'Đang thu thập danh sách...');
    for (let scrollAttempt = 0; scrollAttempt < 50; scrollAttempt++) {
      if (!apiHasMore) break;
      if (minCreators > 0 && creatorQueue.length >= minCreators) break;
      const before = creatorQueue.length;
      await listPage.evaluate(`
        (function() {
          var all = document.querySelectorAll('div, main, section');
          for (var el of all) {
            var style = window.getComputedStyle(el);
            var ov = style.overflow + ' ' + style.overflowY;
            if ((ov.indexOf('scroll') >= 0 || ov.indexOf('auto') >= 0) && el.scrollHeight > el.clientHeight + 50) {
              el.scrollTop = el.scrollHeight;
            }
          }
          window.scrollTo(0, document.body.scrollHeight);
        })()
      `);
      await listPage.waitForTimeout(3000);
      if (creatorQueue.length > before) {
        scrollAttempt = Math.max(0, scrollAttempt - 2);
        onProgress?.(0, creatorQueue.length, 'Phát hiện ' + creatorQueue.length + ' creators...');
      }
    }

    // Phase 2: Scrape detail pages
    const totalCreators = minCreators > 0 ? Math.min(creatorQueue.length, minCreators) : creatorQueue.length;
    logger.info('[Scraper] Phase 1 xong: ' + creatorQueue.length + ' creators, sẽ cào ' + totalCreators);

    const detailPages: any[] = [];
    for (let i = 0; i < CONCURRENT_TABS; i++) {
      const p = await ctx.newPage();
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      detailPages.push(p);
    }

    let captchaFailCount = 0;

    try {
      for (let batchStart = 0; batchStart < totalCreators && !captchaBlocked; batchStart += CONCURRENT_TABS) {
        const batchEnd = Math.min(batchStart + CONCURRENT_TABS, totalCreators);
        const batch = creatorQueue.slice(batchStart, batchEnd);

        onProgress?.(results.length, totalCreators, 'Đang cào ' + (batchStart + 1) + '-' + batchEnd + '/' + totalCreators);

        const batchPromises = batch.map(async (creator, idx) => {
          if (captchaBlocked) return;
          const tabPage = detailPages[idx];
          if (!tabPage) return;

          const globalIdx = batchStart + idx + 1;
          logger.info('[Scraper] [' + globalIdx + '/' + totalCreators + '] ' + creator.handle);

          const contactInfo = await scrapeContactInTab(tabPage, creator.oecuid, (blocked) => {
            if (blocked) {
              captchaFailCount++;
              logger.warn('[Scraper] Captcha fail #' + captchaFailCount + ' trên tab ' + idx);
              if (captchaFailCount >= MAX_CAPTCHA_FAILS) {
                captchaBlocked = true;
                logger.error('[Scraper] Captcha fail ' + MAX_CAPTCHA_FAILS + ' lần liên tục → dừng');
              }
            }
          });

          if (contactInfo) captchaFailCount = 0;

          const r = {
            username: creator.handle,
            nickname: creator.nickname,
            bio: contactInfo?.bio || '',
            followers: creator.followers,
            gmv: creator.gmv || '',
            categories: creator.categories || '',
            items_sold: creator.items_sold || '',
            content_type: creator.content_type || '',
            phone: contactInfo?.phone || '',
            zalo: contactInfo?.zalo || '',
            whatsapp: contactInfo?.whatsapp || '',
            email: contactInfo?.email || '',
            tiktok: creator.handle ? 'https://www.tiktok.com/@' + creator.handle : '',
            detailLink: 'https://affiliate.tiktok.com/connection/creator/detail?cid=' + creator.oecuid + '&shop_region=VN&shop_id=' + SHOP_ID,
          };

          results.push(r);
          logger.info('[Scraper] ' + r.username + ' | Z:' + (r.zalo || '-') + ' | W:' + (r.whatsapp || '-') + ' | E:' + (r.email || '-'));
          onProgress?.(results.length, totalCreators, '[' + results.length + '/' + totalCreators + '] ' + r.username);
        });

        await Promise.all(batchPromises);

        if (results.length > 0 && results.length % (CONCURRENT_TABS * 5) < CONCURRENT_TABS) {
          saveXlsx(results, false);
          logger.info('[Scraper] Đã lưu tạm ' + results.length + ' creators');
        }

        if (!captchaBlocked) await detailPages[0].waitForTimeout(2000);
      }

      for (const p of detailPages) await p.close().catch(() => {});

      const outPath = saveXlsx(results, true);
      logger.info('[Scraper] Hoàn tất: ' + results.length + ' creators → ' + outPath);

      return { total: totalCreators, saved: results.length, captchaBlocked };

    } finally {
      for (const p of ctx.pages()) {
        if (p !== listPage) await p.close().catch(() => {});
      }
    }
  }
}
