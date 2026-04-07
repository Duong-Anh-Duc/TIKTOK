import { Router } from 'express';
import { GemLoginController } from './gemlogin.controller';
import { authenticate, authorize } from '../../middleware/auth';

export const gemloginRoutes = Router();

gemloginRoutes.use(authenticate);

// ── Info ──────────────────────────────────────────────────────────────────────
gemloginRoutes.get('/browser-versions', GemLoginController.getBrowserVersions);
gemloginRoutes.get('/groups', GemLoginController.getGroups);

// ── Profiles ──────────────────────────────────────────────────────────────────
gemloginRoutes.get('/profiles', GemLoginController.getProfiles);
gemloginRoutes.get('/profiles/:id', GemLoginController.getProfile);
gemloginRoutes.post('/profiles', authorize('ADMIN'), GemLoginController.createProfile);
gemloginRoutes.put('/profiles/:id', authorize('ADMIN'), GemLoginController.updateProfile);
gemloginRoutes.delete('/profiles/:id', authorize('ADMIN'), GemLoginController.deleteProfile);
gemloginRoutes.post('/profiles/fingerprint', authorize('ADMIN'), GemLoginController.changeFingerprint);

// ── Browser control ─────────────────────────────────────────────────────────
gemloginRoutes.post('/start', authorize('ADMIN', 'STAFF'), GemLoginController.startProfile);
gemloginRoutes.post('/close', authorize('ADMIN', 'STAFF'), GemLoginController.closeProfile);
gemloginRoutes.get('/status', GemLoginController.getStatus);
