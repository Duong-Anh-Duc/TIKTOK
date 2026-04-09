import { Router } from 'express';
import { ScraperController } from './scraper.controller';
import { authenticate, authorize } from '../../middleware/auth';

export const scraperRoutes = Router();

// Public route — tải file không cần đăng nhập
scraperRoutes.get('/files/public/:name', ScraperController.downloadFile);

scraperRoutes.use(authenticate);

scraperRoutes.post('/scrape', authorize('ADMIN', 'STAFF'), ScraperController.scrape);
scraperRoutes.post('/test-filter', authorize('ADMIN', 'STAFF'), ScraperController.testFilter);
scraperRoutes.post('/test-login', authorize('ADMIN', 'STAFF'), ScraperController.testLogin);
scraperRoutes.get('/creators', ScraperController.getCreators);
scraperRoutes.get('/job/:id', ScraperController.getJobStatus);
scraperRoutes.delete('/creators', authorize('ADMIN'), ScraperController.deleteAll);

// File management
scraperRoutes.get('/files', ScraperController.listFiles);
scraperRoutes.get('/files/:name', ScraperController.downloadFile);
scraperRoutes.put('/files/:name/rename', authorize('ADMIN', 'STAFF'), ScraperController.renameFile);
scraperRoutes.post('/files/delete-bulk', authorize('ADMIN'), ScraperController.deleteBulk);
scraperRoutes.delete('/files/:name', authorize('ADMIN'), ScraperController.deleteFile);
