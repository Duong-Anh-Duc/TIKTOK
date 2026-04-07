import type { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';

const userService = new UserService();

export class UserController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { page = '1', limit = '20', search } = req.query;
      const result = await userService.getAll(
        parseInt(page as string),
        parseInt(limit as string),
        search as string
      );
      res.json({
        success: true,
        message: t ? t('user.listRetrieved') : 'Users retrieved',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const user = await userService.create(req.body);
      res.status(201).json({
        success: true,
        message: t ? t('user.created') : 'User created',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const user = await userService.update(String(req.params.id), req.body);
      res.json({
        success: true,
        message: t ? t('user.updated') : 'User updated',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      await userService.delete(String(req.params.id));
      res.json({
        success: true,
        message: t ? t('user.deleted') : 'User deleted',
      });
    } catch (error) {
      next(error);
    }
  }
}
