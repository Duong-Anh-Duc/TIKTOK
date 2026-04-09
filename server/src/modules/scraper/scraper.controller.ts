import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { SHOP_ID, CONCURRENT_TABS } from '../../constants';
import { TikTokScraperService, testAutoLogin } from './tiktok-scraper.service';
import { GemLoginService } from '../gemlogin/gemlogin.service';

const prisma = new PrismaClient();
const LOGS_DIR = path.resolve(__dirname, '..', '..', '..', 'data');

export class ScraperController {
  /**
   * POST /api/scraper/scrape
   * Body: { minCreators? }
   * Bắt đầu cào creators (0 = cào đến khi hết hoặc bị captcha)
   */
  static async scrape(req: Request, res: Response) {
    const t = (req as any).t;
    const minCreators: number = req.body?.minCreators || 0;
    const categories: string[][] = req.body?.categories || [];
    const contentType: string = req.body?.contentType || '';
    const gmv: string[] = req.body?.gmv || [];
    const itemsSold: string[] = req.body?.itemsSold || [];
    const liveViewerMin: number = req.body?.liveViewerMin || 0;
    const concurrentTabs: number = CONCURRENT_TABS;

    const job = await prisma.scrapeJob.create({
      data: { shop_id: SHOP_ID, status: 'running', started_at: new Date() },
    });

    res.json({
      success: true,
      message: t ? t('scraper.started') : 'Scraping started',
      data: { jobId: job.id },
    });

    (async () => {
      try {
        if (!GemLoginService.getStatus().isRunning) {
          const profileId = process.env.GEMLOGIN_PROFILE_ID || '1';
          await GemLoginService.startProfile(profileId);
        }

        const result = await TikTokScraperService.scrapeCreators(
          minCreators,
          categories,
          contentType,
          gmv,
          itemsSold,
          liveViewerMin,
          async (scraped, total, msg) => {

            await prisma.scrapeJob.update({
              where: { id: job.id },
              data: { scraped, total: total || scraped, status: 'running', message: msg || null },
            }).catch(() => {});
          },
          concurrentTabs,
        );

        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: result.captchaBlocked ? 'captcha' : 'completed',
            total: result.total,
            scraped: result.saved,
            finished_at: new Date(),
          },
        });

        logger.info(`[Scraper] Job done: ${result.saved} creators`);
      } catch (err: any) {
        logger.error(`[Scraper] Job failed: ${err.message}`);
        // Lấy số lượng đã cào từ job hiện tại để hiển thị cho user
        const currentJob = await prisma.scrapeJob.findUnique({ where: { id: job.id } }).catch(() => null);
        const scraped = currentJob?.scraped || 0;
        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: err.message,
            finished_at: new Date(),
            scraped,
          },
        }).catch(() => {});
      }
    })();
  }

  /**
   * GET /api/scraper/creators
   * Lấy danh sách creators đã cào (có phân trang + tìm kiếm)
   */
  static async getCreators(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;

      const where = search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' as const } },
              { display_name: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [data, total] = await Promise.all([
        prisma.creator.findMany({
          where,
          orderBy: { scraped_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.creator.count({ where }),
      ]);

      res.json({
        success: true,
        message: t ? t('scraper.creatorsRetrieved') : 'Creators retrieved',
        data: {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/scraper/job/:id
   * Lấy trạng thái job
   */
  static async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await prisma.scrapeJob.findUnique({
        where: { id: String(req.params.id) },
      });

      if (!job) {
        const t = (req as any).t;
        res.status(404).json({ success: false, message: t ? t('scraper.jobNotFound') : 'Job not found' });
        return;
      }

      res.json({ success: true, data: job });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/scraper/test-filter
   * Mở TikTok list page + áp dụng filter để user xem trên browser
   */
  static async testFilter(req: Request, res: Response) {
    try {
      const { categories, contentType, gmv, itemsSold, liveViewerMin } = req.body;

      if (!GemLoginService.getStatus().isRunning) {
        const profileId = process.env.GEMLOGIN_PROFILE_ID || '1';
        await GemLoginService.startProfile(profileId);
      }

      await TikTokScraperService.testFilter(categories, contentType, gmv, itemsSold, liveViewerMin);
      const t = (req as any).t;
      res.json({ success: true, message: t ? t('scraper.filterApplied') : 'Filter applied on TikTok' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/scraper/test-login
   * Test auto-login TikTok Shop
   */
  static async testLogin(req: Request, res: Response) {
    try {
      if (!GemLoginService.getStatus().isRunning) {
        const profileId = process.env.GEMLOGIN_PROFILE_ID || '1';
        await GemLoginService.startProfile(profileId);
      }

      const result = await testAutoLogin();
      res.json({ success: result.success, message: result.message, data: { url: result.url } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * DELETE /api/scraper/creators
   */
  static async deleteAll(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      await prisma.creator.deleteMany({});
      res.json({ success: true, message: t ? t('scraper.creatorsDeleted') : 'All creators deleted' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/scraper/files
   * Danh sách file Excel trong logs/
   */
  static async listFiles(_req: Request, res: Response) {
    try {
      if (!fs.existsSync(LOGS_DIR)) {
        res.json({ success: true, data: [] });
        return;
      }
      // Lấy completed/failed jobs gần đây để match duration
      const recentJobs = await prisma.scrapeJob.findMany({
        where: { status: { in: ['completed', 'failed', 'captcha'] } },
        orderBy: { finished_at: 'desc' },
        take: 50,
        select: { started_at: true, finished_at: true, scraped: true, total: true },
      });

      const files = fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith('.xlsx'))
        .map(f => {
          const stat = fs.statSync(path.join(LOGS_DIR, f));
          const fileTime = stat.mtime.getTime();

          // Match file với job gần nhất (finished_at gần thời gian file nhất, trong 60s)
          let duration: number | null = null;
          let jobScraped: number | null = null;
          let jobTotal: number | null = null;
          for (const job of recentJobs) {
            if (job.finished_at && job.started_at) {
              const diff = Math.abs(job.finished_at.getTime() - fileTime);
              if (diff < 60000) {
                duration = Math.round((job.finished_at.getTime() - job.started_at.getTime()) / 1000);
                jobScraped = job.scraped;
                jobTotal = job.total;
                break;
              }
            }
          }

          return {
            name: f,
            size: stat.size,
            createdAt: stat.mtime.toISOString(),
            duration,
            scraped: jobScraped,
            total: jobTotal,
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ success: true, data: files });
    } catch {
      res.json({ success: true, data: [] });
    }
  }

  /**
   * GET /api/scraper/files/:name
   * Tải file Excel
   */
  static async downloadFile(req: Request, res: Response) {
    const t = (req as any).t;
    const fileName = String(req.params.name);
    if (!fileName.endsWith('.xlsx') || fileName.includes('..')) {
      res.status(400).json({ success: false, message: t ? t('scraper.invalidFile') : 'Invalid file' });
      return;
    }
    const filePath = path.join(LOGS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: t ? t('scraper.fileNotFound') : 'File not found' });
      return;
    }
    res.download(filePath, fileName);
  }

  /**
   * PUT /api/scraper/files/:name/rename
   * Đổi tên file Excel
   */
  static async renameFile(req: Request, res: Response) {
    const t = (req as any).t;
    const oldName = String(req.params.name);
    const { newName } = req.body;

    if (!oldName.endsWith('.xlsx') || oldName.includes('..')) {
      res.status(400).json({ success: false, message: t ? t('scraper.invalidFile') : 'Invalid file' });
      return;
    }
    if (!newName || typeof newName !== 'string') {
      res.status(400).json({ success: false, message: t ? t('scraper.newNameRequired') : 'New file name is required' });
      return;
    }

    const safeName = newName.trim().replace(/[^a-zA-Z0-9_\-.\u00C0-\u024F\u1E00-\u1EFF ]/g, '') + (newName.endsWith('.xlsx') ? '' : '.xlsx');
    const oldPath = path.join(LOGS_DIR, oldName);
    const newPath = path.join(LOGS_DIR, safeName);

    if (!fs.existsSync(oldPath)) {
      res.status(404).json({ success: false, message: t ? t('scraper.fileNotFound') : 'File not found' });
      return;
    }

    fs.renameSync(oldPath, newPath);
    res.json({ success: true, message: t ? t('scraper.fileRenamed') : 'File renamed', data: { name: safeName } });
  }

  /**
   * DELETE /api/scraper/files/:name
   * Xóa file Excel
   */
  static async deleteFile(req: Request, res: Response) {
    const t = (req as any).t;
    const fileName = String(req.params.name);
    if (!fileName.endsWith('.xlsx') || fileName.includes('..')) {
      res.status(400).json({ success: false, message: t ? t('scraper.invalidFile') : 'Invalid file' });
      return;
    }
    const filePath = path.join(LOGS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true, message: t ? t('scraper.fileDeleted') : 'File deleted' });
  }

  /**
   * POST /api/scraper/files/delete-bulk
   * Xóa nhiều file
   */
  static async deleteBulk(req: Request, res: Response) {
    const t = (req as any).t;
    const { names } = req.body;
    if (!Array.isArray(names) || names.length === 0) {
      res.status(400).json({ success: false, message: 'No files specified' });
      return;
    }
    let deleted = 0;
    for (const name of names) {
      if (typeof name !== 'string' || !name.endsWith('.xlsx') || name.includes('..')) continue;
      const filePath = path.join(LOGS_DIR, name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    }
    res.json({ success: true, message: t ? t('scraper.filesDeleted', { count: deleted }) : `Deleted ${deleted} files`, data: { deleted } });
  }
}
