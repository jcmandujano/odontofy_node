import { Router } from 'express';

import { noStore } from '../../platform/http/cache.middleware';
import { validateRequest } from '../../platform/http/validate.middleware';
import { authenticate } from '../identity/identity.middleware';
import { createFileController } from './file.controller';
import { fileErrorHandler, receivePdf } from './file.middleware';
import { fileParamsSchema, uploadFileSchema } from './file.schemas';
import { FileService, FileServiceDependencies } from './file.service';

export const createFileRouter = (identity: import('../identity/identity.service').IdentityService, dependencies: FileServiceDependencies = {}) => {
  const router = Router();
  const controller = createFileController(new FileService(dependencies));
  router.use('/files', noStore, authenticate(identity));
  router.post('/files', receivePdf, validateRequest({ body: uploadFileSchema }), controller.upload);
  router.get('/files/:fileId/access', validateRequest({ params: fileParamsSchema }), controller.access);
  router.delete('/files/:fileId', validateRequest({ params: fileParamsSchema }), controller.remove);
  router.use(fileErrorHandler);
  return router;
};
