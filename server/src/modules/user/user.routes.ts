import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate, authorize } from '../../middleware/auth';

export const userRoutes = Router();
const controller = new UserController();

userRoutes.use(authenticate);
userRoutes.use(authorize('ADMIN'));

userRoutes.get('/', controller.getAll);
userRoutes.post('/', controller.create);
userRoutes.put('/:id', controller.update);
userRoutes.delete('/:id', controller.delete);
