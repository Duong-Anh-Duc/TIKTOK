import { Router } from 'express';
import { SchedulerController } from './scheduler.controller';
import { authenticate, authorize } from '../../middleware/auth';

export const schedulerRoutes = Router();

schedulerRoutes.use(authenticate);
schedulerRoutes.use(authorize('ADMIN', 'STAFF'));

schedulerRoutes.get('/', SchedulerController.list);
schedulerRoutes.post('/', SchedulerController.create);
schedulerRoutes.put('/:id', SchedulerController.update);
schedulerRoutes.delete('/:id', SchedulerController.remove);
schedulerRoutes.post('/:id/toggle', SchedulerController.toggle);
schedulerRoutes.post('/:id/run', SchedulerController.runNow);
