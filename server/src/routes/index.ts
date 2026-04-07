import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { userRoutes } from '../modules/user/user.routes';
import { gemloginRoutes } from '../modules/gemlogin/gemlogin.routes';
import { scraperRoutes } from '../modules/scraper/scraper.routes';
import { settingsRoutes } from '../modules/settings/settings.routes';
import { schedulerRoutes } from '../modules/scheduler/scheduler.routes';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/users', userRoutes);
routes.use('/gemlogin', gemloginRoutes);
routes.use('/scraper', scraperRoutes);
routes.use('/settings', settingsRoutes);
routes.use('/schedules', schedulerRoutes);
