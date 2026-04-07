import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { schedulerService } from './scheduler.service';

const prisma = new PrismaClient();

export class SchedulerController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const schedules = await prisma.scrapeSchedule.findMany({
        orderBy: { created_at: 'desc' },
      });
      res.json({ success: true, data: schedules });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { name, cron_expr, max_creators, categories, content_type, gmv, items_sold, live_viewer_min } = req.body;

      if (!name || !cron_expr) {
        res.status(400).json({ success: false, message: t ? t('scheduler.nameRequired') : 'Name and cron expression are required' });
        return;
      }
      if (!cron.validate(cron_expr)) {
        res.status(400).json({ success: false, message: t ? t('scheduler.cronInvalid') : 'Invalid cron expression' });
        return;
      }

      const schedule = await prisma.scrapeSchedule.create({
        data: {
          name,
          cron_expr,
          max_creators: max_creators || 0,
          categories: categories || [],
          content_type: content_type || '',
          gmv: gmv || [],
          items_sold: items_sold || [],
          live_viewer_min: live_viewer_min || 0,
        },
      });

      schedulerService.register(schedule);
      res.json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { id } = req.params;
      const { name, cron_expr, max_creators, categories, content_type, gmv, items_sold, live_viewer_min } = req.body;

      if (cron_expr && !cron.validate(cron_expr)) {
        res.status(400).json({ success: false, message: t ? t('scheduler.cronInvalid') : 'Invalid cron expression' });
        return;
      }

      const schedule = await prisma.scrapeSchedule.update({
        where: { id: String(id) },
        data: {
          ...(name !== undefined && { name }),
          ...(cron_expr !== undefined && { cron_expr }),
          ...(max_creators !== undefined && { max_creators }),
          ...(categories !== undefined && { categories }),
          ...(content_type !== undefined && { content_type }),
          ...(gmv !== undefined && { gmv }),
          ...(items_sold !== undefined && { items_sold }),
          ...(live_viewer_min !== undefined && { live_viewer_min }),
        },
      });

      schedulerService.register(schedule);
      res.json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      schedulerService.remove(String(id));
      await prisma.scrapeSchedule.delete({ where: { id: String(id) } });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { id } = req.params;
      const current = await prisma.scrapeSchedule.findUnique({ where: { id: String(id) } });
      if (!current) {
        res.status(404).json({ success: false, message: t ? t('scheduler.notFound') : 'Schedule not found' });
        return;
      }

      const schedule = await prisma.scrapeSchedule.update({
        where: { id: String(id) },
        data: { is_enabled: !current.is_enabled },
      });

      if (schedule.is_enabled) {
        schedulerService.register(schedule);
      } else {
        schedulerService.remove(schedule.id);
      }

      res.json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }

  static async runNow(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { id } = req.params;
      if (await schedulerService.isExecuting()) {
        res.status(409).json({ success: false, message: t ? t('scheduler.alreadyRunning') : 'A scheduled scrape is already running' });
        return;
      }
      schedulerService.execute(String(id)).catch(() => {});
      res.json({ success: true, message: t ? t('scheduler.runStarted') : 'Schedule started running' });
    } catch (error) {
      next(error);
    }
  }
}
