import { Router } from 'express';
import { SettingsController } from './settings.controller';

export const settingsRoutes = Router();

settingsRoutes.get('/', SettingsController.get);
settingsRoutes.put('/', SettingsController.update);
