import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { TikTokScraperService } from '../scraper/tiktok-scraper.service';
import { GemLoginService } from '../gemlogin/gemlogin.service';
import { logger } from '../../utils/logger';
import { acquireScraperLock, releaseScraperLock, isScraperRunning } from '../../utils/scraperLock';

const prisma = new PrismaClient();

class SchedulerService {
  private tasks = new Map<string, cron.ScheduledTask>();

  async initAll() {
    const schedules = await prisma.scrapeSchedule.findMany({ where: { is_enabled: true } });
    for (const s of schedules) {
      this.register(s);
    }
    logger.info(`[Scheduler] Initialized ${schedules.length} cron jobs`);
  }

  register(schedule: { id: string; cron_expr: string; is_enabled: boolean }) {
    // Remove existing task if any
    this.remove(schedule.id);

    if (!schedule.is_enabled) return;
    if (!cron.validate(schedule.cron_expr)) {
      logger.warn(`[Scheduler] Invalid cron: "${schedule.cron_expr}" for schedule ${schedule.id}`);
      return;
    }

    const task = cron.schedule(schedule.cron_expr, () => {
      this.execute(schedule.id).catch((err) => {
        logger.error(`[Scheduler] Execute error: ${err.message}`);
      });
    });
    this.tasks.set(schedule.id, task);
    logger.info(`[Scheduler] Registered: ${schedule.id} → "${schedule.cron_expr}"`);
  }

  remove(id: string) {
    const existing = this.tasks.get(id);
    if (existing) {
      existing.stop();
      this.tasks.delete(id);
    }
  }

  async execute(scheduleId: string) {
    const locked = await acquireScraperLock();
    if (!locked) {
      logger.warn(`[Scheduler] Skip schedule ${scheduleId} — another scrape is running`);
      return;
    }

    const schedule = await prisma.scrapeSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule || !schedule.is_enabled) {
      await releaseScraperLock();
      return;
    }
    logger.info(`[Scheduler] Executing schedule: ${schedule.name}`);

    const job = await prisma.scrapeJob.create({
      data: { shop_id: '7496039374454229703', status: 'running', started_at: new Date(), message: `[Auto] ${schedule.name}` },
    });

    await prisma.scrapeSchedule.update({
      where: { id: scheduleId },
      data: { last_run_at: new Date(), last_job_id: job.id },
    });

    try {
      if (!GemLoginService.getStatus().isRunning) {
        const profileId = process.env.GEMLOGIN_PROFILE_ID || '1';
        await GemLoginService.startProfile(profileId);
      }

      const result = await TikTokScraperService.scrapeCreators(
        schedule.max_creators,
        schedule.categories as string[][],
        schedule.content_type,
        schedule.gmv as string[],
        schedule.items_sold as string[],
        schedule.live_viewer_min,
        async (scraped, total, msg) => {
          await prisma.scrapeJob.update({
            where: { id: job.id },
            data: { scraped, total: total || scraped, status: 'running', message: msg || null },
          }).catch(() => {});
        },
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
      logger.info(`[Scheduler] Job done: ${result.saved} creators`);
    } catch (err: any) {
      logger.error(`[Scheduler] Job failed: ${err.message}`);
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: err.message, finished_at: new Date() },
      }).catch(() => {});
    } finally {
      await releaseScraperLock();
    }
  }

  async isExecuting() {
    return isScraperRunning();
  }
}

export const schedulerService = new SchedulerService();
