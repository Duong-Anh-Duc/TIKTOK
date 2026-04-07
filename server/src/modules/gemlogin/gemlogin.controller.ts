import type { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { GemLoginService } from './gemlogin.service';

export class GemLoginController {
  // ── Info ──────────────────────────────────────────────────────────────────

  static async getBrowserVersions(_req: Request, res: Response): Promise<void> {
    try {
      const data = await GemLoginService.getBrowserVersions();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getGroups(_req: Request, res: Response): Promise<void> {
    try {
      const data = await GemLoginService.getGroups();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // ── Profiles ──────────────────────────────────────────────────────────────

  static async getProfiles(_req: Request, res: Response): Promise<void> {
    try {
      const data = await GemLoginService.getProfiles();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const data = await GemLoginService.getProfile(String(req.params.id));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const data = await GemLoginService.createProfile(req.body);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const data = await GemLoginService.updateProfile(String(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const data = await GemLoginService.deleteProfile(String(req.params.id));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async changeFingerprint(req: Request, res: Response): Promise<void> {
    try {
      const ids = req.query.ids ? String(req.query.ids).split(',') : undefined;
      const data = await GemLoginService.changeFingerprint(ids);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // ── Start / Close ───────────────────────────────────────────────────────

  static async startProfile(req: Request, res: Response): Promise<void> {
    try {
      const t = (req as any).t;
      const profileId: string = req.body?.profileId || process.env.GEMLOGIN_PROFILE_ID || '1';
      const result = await GemLoginService.startProfile(profileId);
      res.json({
        success: true,
        message: t ? t('gemlogin.startSuccess') : 'GemLogin profile started',
        ...result,
      });
    } catch (err: any) {
      logger.error(`[GemLogin] startProfile error: ${err.message}`);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async closeProfile(req: Request, res: Response): Promise<void> {
    try {
      const t = (req as any).t;
      const profileId: string | undefined = req.body?.profileId;
      await GemLoginService.closeProfile(profileId);
      res.json({
        success: true,
        message: t ? t('gemlogin.closeSuccess') : 'GemLogin profile closed',
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getStatus(_req: Request, res: Response): Promise<void> {
    res.set('Cache-Control', 'no-store');
    const status = GemLoginService.getStatus();
    res.json({ success: true, ...status });
  }
}
