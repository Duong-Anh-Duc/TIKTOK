import path from 'path';
import XLSX from 'xlsx';
import { logger } from '../../../utils/logger';

let currentJobFile = '';
let currentLogFile = '';

/**
 * Ghi log chi tiết 1 creator vào file txt — dùng để debug missing fields
 */
export function appendCreatorLog(idx: number, total: number, creator: any): void {
  try {
    const fs = require('fs');
    const logsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    if (!currentLogFile) {
      const base = currentJobFile ? currentJobFile.replace('.xlsx', '') : 'scrape-' + Date.now();
      currentLogFile = base + '.log.txt';
      const header = '='.repeat(80) + '\n'
        + 'SCRAPE LOG — ' + new Date().toLocaleString() + '\n'
        + '='.repeat(80) + '\n\n';
      fs.writeFileSync(path.resolve(logsDir, currentLogFile), header);
    }

    // Phát hiện các field bị miss
    const missing: string[] = [];
    if (!creator.followers) missing.push('Followers');
    if (!creator.gmv) missing.push('GMV');
    if (!creator.categories) missing.push('Categories');
    if (!creator.items_sold) missing.push('ItemsSold');
    if (!creator.content_type) missing.push('RevenueSource');
    if (!creator.email && !creator.phone && !creator.zalo) missing.push('Contact');

    // Phát hiện categories bị junk (lẫn "Điểm", "Chưa có điểm", etc.)
    const junkPattern = /(Điểm|Chưa có điểm|Người theo dõi|Followers)/i;
    const hasCategoryJunk = creator.categories && junkPattern.test(creator.categories);

    const status = missing.length === 0 && !hasCategoryJunk ? 'OK' :
                   hasCategoryJunk ? 'JUNK_CATEGORIES' :
                   'MISS:' + missing.join(',');

    const lines = [
      '[' + idx + '/' + total + '] ' + (creator.username || '?') + '  →  ' + status,
      '  Bio:           ' + (creator.bio || '(empty)'),
      '  Followers:     ' + (creator.followers || '(MISS)'),
      '  GMV:           ' + (creator.gmv || '(MISS)'),
      '  Categories:    ' + (creator.categories || '(MISS)') + (hasCategoryJunk ? '  ⚠️ JUNK' : ''),
      '  ItemsSold:     ' + (creator.items_sold || '(MISS)'),
      '  RevenueSource: ' + (creator.content_type || '(MISS)'),
      '  Phone:         ' + (creator.phone || '(empty)'),
      '  Zalo:          ' + (creator.zalo || '(empty)'),
      '  Whatsapp:      ' + (creator.whatsapp || '(empty)'),
      '  Email:         ' + (creator.email || '(empty)'),
      '  URL:           ' + (creator.detailLink || ''),
      '',
    ];

    fs.appendFileSync(path.resolve(logsDir, currentLogFile), lines.join('\n'));
  } catch (e: any) {
    logger.warn('[Scraper] Không ghi được log creator: ' + e.message);
  }
}

/**
 * Ghi summary cuối job
 */
export function finalizeCreatorLog(results: any[]): void {
  try {
    if (!currentLogFile) return;
    const fs = require('fs');
    const logsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data');

    const total = results.length;
    let missCount = 0, junkCount = 0;
    const missByField: Record<string, number> = {
      Followers: 0, GMV: 0, Categories: 0, ItemsSold: 0, RevenueSource: 0, Contact: 0,
    };
    const junkPattern = /(Điểm|Chưa có điểm|Người theo dõi|Followers)/i;

    for (const r of results) {
      let hasMiss = false;
      if (!r.followers) { missByField.Followers++; hasMiss = true; }
      if (!r.gmv) { missByField.GMV++; hasMiss = true; }
      if (!r.categories) { missByField.Categories++; hasMiss = true; }
      if (!r.items_sold) { missByField.ItemsSold++; hasMiss = true; }
      if (!r.content_type) { missByField.RevenueSource++; hasMiss = true; }
      if (!r.email && !r.phone && !r.zalo) { missByField.Contact++; hasMiss = true; }
      if (hasMiss) missCount++;
      if (r.categories && junkPattern.test(r.categories)) junkCount++;
    }

    const summary = [
      '',
      '='.repeat(80),
      'SUMMARY',
      '='.repeat(80),
      'Total scraped:        ' + total,
      'Records with miss:    ' + missCount + ' (' + Math.round(missCount / total * 100) + '%)',
      'Junk categories:      ' + junkCount + ' (' + Math.round(junkCount / total * 100) + '%)',
      '',
      'Miss by field:',
      '  Followers:     ' + missByField.Followers,
      '  GMV:           ' + missByField.GMV,
      '  Categories:    ' + missByField.Categories,
      '  ItemsSold:     ' + missByField.ItemsSold,
      '  RevenueSource: ' + missByField.RevenueSource,
      '  Contact:       ' + missByField.Contact,
      '',
    ].join('\n');

    fs.appendFileSync(path.resolve(logsDir, currentLogFile), summary);
    logger.info('[Scraper] Log file: ' + currentLogFile);
    currentLogFile = '';
  } catch {}
}

export function saveXlsx(results: any[], isFinal = false): string {
  if (results.length === 0) return '';

  const wsData = [
    ['STT', 'Username', 'Tên', 'Bio', 'Followers', 'Doanh thu (GMV)', 'Hạng mục sản phẩm', 'Số SP bán ra', 'Nguồn doanh thu', 'SĐT', 'Zalo', 'Whatsapp', 'Email', 'TikTok', 'Link Detail'],
    ...results.map((r, i) => [
      i + 1, r.username, r.nickname, r.bio, r.followers,
      r.gmv || '', r.categories || '', r.items_sold || '', r.content_type || '',
      r.phone || '', r.zalo || '', r.whatsapp || '', r.email || '', r.tiktok, r.detailLink || '',
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 4 }, { wch: 22 }, { wch: 25 }, { wch: 50 },
    { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 18 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Creators');

  const logsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data');

  if (!currentJobFile) {
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const hh = String(vnTime.getUTCHours()).padStart(2, '0');
    const mm = String(vnTime.getUTCMinutes()).padStart(2, '0');
    const ss = String(vnTime.getUTCSeconds()).padStart(2, '0');
    const dd = String(vnTime.getUTCDate()).padStart(2, '0');
    const MM = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = vnTime.getUTCFullYear();
    currentJobFile = `creators-${hh}h${mm}m${ss}s-${dd}-${MM}-${yyyy}.xlsx`;
    logger.info('[Scraper] File output: ' + currentJobFile);
  }

  const outPath = path.resolve(logsDir, currentJobFile);

  const fs = require('fs');
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  XLSX.writeFile(wb, outPath);

  // Bản rút gọn: chỉ xuất khi isFinal
  if (isFinal && results.length > 0) {
    const simpleData = [
      ['STT', 'ID Kênh', 'Follow', 'Doanh thu', 'Hạng mục sản phẩm', 'Số lượng SP bán ra', 'Nguồn doanh thu', 'Zalo/SĐT'],
      ...results.map((r, i) => [
        i + 1,
        r.username || '',
        r.followers || '',
        r.gmv || '',
        r.categories || '',
        r.items_sold || '',
        r.content_type || '',
        r.zalo || r.phone || '',
      ]),
    ];
    const simpleWb = XLSX.utils.book_new();
    const simpleWs = XLSX.utils.aoa_to_sheet(simpleData);
    simpleWs['!cols'] = [
      { wch: 4 }, { wch: 22 }, { wch: 12 }, { wch: 18 },
      { wch: 25 }, { wch: 18 }, { wch: 25 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(simpleWb, simpleWs, 'Creators');

    const simpleName = currentJobFile.replace('.xlsx', '-simple.xlsx');
    const simplePath = path.resolve(logsDir, simpleName);
    if (fs.existsSync(simplePath)) fs.unlinkSync(simplePath);
    XLSX.writeFile(simpleWb, simplePath);
    logger.info('[Scraper] File rút gọn: ' + simpleName);
  }

  if (isFinal) currentJobFile = '';

  return outPath;
}
