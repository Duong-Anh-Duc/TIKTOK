/**
 * TikTok Scraper — Filter helpers (apply filters on TikTok Affiliate page)
 */
import { logger } from '../../../utils/logger';

export async function safeClick(page: any, x: number, y: number) {
  await page.evaluate(`
    (function() {
      var el = document.elementFromPoint(${x}, ${y});
      if (!el) return;
      ['mousedown', 'mouseup', 'click'].forEach(function(type) {
        el.dispatchEvent(new MouseEvent(type, {
          bubbles: true, cancelable: true, view: window,
          clientX: ${x}, clientY: ${y}
        }));
      });
    })()
  `);
}

export async function applyAllFilters(
  page: any,
  categories: string[][] = [],
  contentType: string = '',
  gmv: string[] = [],
  itemsSold: string[] = [],
  liveViewerMin: number = 0,
) {
  async function openDropdown(label: string) {
    const pos = await page.evaluate(`
      (function() {
        var btns = document.querySelectorAll('button.arco-btn');
        for (var btn of btns) {
          if (btn.textContent.indexOf('${label}') >= 0) {
            var r = btn.getBoundingClientRect();
            return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
          }
        }
        return null;
      })()
    `);
    if (pos) { await safeClick(page, pos.x, pos.y); await page.waitForTimeout(1500); return true; }
    return false;
  }

  async function clickItemByText(text: string) {
    await page.evaluate(`
      (function() {
        var popups = document.querySelectorAll('.arco-trigger-popup, .arco-cascader-popup, .arco-popover-content');
        var popup = null;
        for (var p of popups) { var r = p.getBoundingClientRect(); if (r.height > 50) { popup = p; break; } }
        if (!popup) popup = document;
        var all = popup.querySelectorAll('li, label, div, span');
        for (var el of all) {
          var fullText = el.textContent.trim();
          if (fullText === '${text.replace(/'/g, "\\'")}' || fullText.indexOf('${text.replace(/'/g, "\\'")}') >= 0 && fullText.length < 40) {
            var rect = el.getBoundingClientRect();
            if (rect.top > 100 && rect.height > 10 && rect.height < 50) {
              el.scrollIntoView({ block: 'center' });
              var cb = el.querySelector('label.arco-checkbox, .arco-radio, input');
              (cb || el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              return;
            }
          }
        }
      })()
    `);
    await page.waitForTimeout(800);
  }

  async function expandParent(title: string) {
    await page.evaluate(`
      (function() {
        var lis = document.querySelectorAll('li.arco-cascader-list-item');
        for (var li of lis) {
          var t = li.getAttribute('title') || li.textContent.trim();
          if (t.indexOf('${title.replace(/'/g, "\\'")}') >= 0) {
            li.scrollIntoView({ block: 'center' });
            var label = li.querySelector('.arco-cascader-list-item-label') || li;
            label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return;
          }
        }
      })()
    `);
    await page.waitForTimeout(800);
  }

  async function selectCascaderCheckbox(title: string, column = 0) {
    await page.evaluate(`
      (function() {
        var cols = document.querySelectorAll('.arco-cascader-list-column');
        var container = cols[${column}] || document;
        var lis = container.querySelectorAll('li.arco-cascader-list-item');
        for (var li of lis) {
          var t = li.getAttribute('title') || li.textContent.trim();
          if (t.indexOf('${title.replace(/'/g, "\\'")}') >= 0) {
            li.scrollIntoView({ block: 'center' });
            var cb = li.querySelector('label.arco-checkbox');
            (cb || li).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return;
          }
        }
      })()
    `);
    await page.waitForTimeout(800);
  }

  async function clickTab(tabName: string) {
    await page.evaluate(`
      (function() {
        var all = document.querySelectorAll('div, span, button');
        for (var el of all) {
          var text = el.textContent.trim();
          var rect = el.getBoundingClientRect();
          if (text === '${tabName}' && rect.height > 20 && rect.height < 50 && rect.top > 80 && rect.top < 300) {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return;
          }
        }
      })()
    `);
    await page.waitForTimeout(1500);
  }

  // 1. Hạng mục sản phẩm
  if (categories.length > 0) {
    logger.info(`[Scraper] Filter: ${categories.length} danh mục`);
    if (await openDropdown('Hạng mục sản')) {
      for (const catPath of categories) {
        if (catPath.length === 1) {
          await selectCascaderCheckbox(catPath[0], 0);
        } else {
          await expandParent(catPath[0]);
          await selectCascaderCheckbox(catPath[1], 1);
        }
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);
    }
  }

  // 2. Loại nội dung
  if (contentType) {
    logger.info(`[Scraper] Filter: loại nội dung = ${contentType}`);
    if (await openDropdown('Loại nội du')) {
      await clickItemByText(contentType === 'video' ? 'Video' : 'LIVE');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);
    }
  }

  // 3. Tab Hiệu suất
  const needPerformance = gmv.length > 0 || itemsSold.length > 0 || liveViewerMin > 0;
  if (needPerformance) {
    logger.info('[Scraper] Chuyển tab Hiệu suất');
    await clickTab('Hiệu suất');

    if (gmv.length > 0) {
      logger.info(`[Scraper] Filter GMV: ${gmv.join(', ')}`);
      if (await openDropdown('GMV')) {
        for (const g of gmv) { await clickItemByText(g); }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }

    if (itemsSold.length > 0) {
      logger.info(`[Scraper] Filter Số món bán: ${itemsSold.join(', ')}`);
      if (await openDropdown('Số món bán')) {
        for (const s of itemsSold) { await clickItemByText(s); }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }

    if (liveViewerMin > 0) {
      logger.info(`[Scraper] Filter LIVE viewer >= ${liveViewerMin}`);
      if (await openDropdown('Số người xem')) {
        await page.evaluate(`
          (function() {
            var inp = document.querySelector('input.m4b-input') || document.querySelector('input.arco-input');
            if (!inp) return;
            inp.focus();
            var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(inp, '${liveViewerMin}');
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
          })()
        `);
        await page.waitForTimeout(500);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(500);
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        await page.evaluate(`
          (function() {
            var el = document.querySelector('input[placeholder*="Tìm kiếm"], input[placeholder*="tìm kiếm"]');
            if (el) el.click();
            else { var h = document.querySelector('h1,h2'); if (h) h.click(); }
          })()
        `);
        await page.waitForTimeout(1500);
      }
    }
  }

  // Scroll nhẹ để trigger reload
  await page.evaluate(`
    (function() {
      var all = document.querySelectorAll('div, main, section');
      for (var el of all) {
        var style = window.getComputedStyle(el);
        var ov = style.overflow + ' ' + style.overflowY;
        if ((ov.indexOf('scroll') >= 0 || ov.indexOf('auto') >= 0) && el.scrollHeight > el.clientHeight + 50) {
          el.scrollTop = 1;
          el.scrollTop = 0;
        }
      }
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    })()
  `);
  await page.waitForTimeout(2000);

  logger.info('[Scraper] Tất cả bộ lọc đã áp dụng');
}
