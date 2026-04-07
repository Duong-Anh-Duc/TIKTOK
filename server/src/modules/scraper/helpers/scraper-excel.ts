import path from 'path';
import XLSX from 'xlsx';
import { logger } from '../../../utils/logger';

let currentJobFile = '';

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

  if (isFinal) currentJobFile = '';

  return outPath;
}
