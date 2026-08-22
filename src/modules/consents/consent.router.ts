import { Router } from 'express';

import { noStore } from '../../platform/http/cache.middleware';
import { validateRequest } from '../../platform/http/validate.middleware';
import { authenticate } from '../identity/identity.middleware';
import type { IdentityService } from '../identity/identity.service';
import { createConsentController } from './consent.controller';
import { consentErrorHandler } from './consent.middleware';
import {
  attachSignedDocumentSchema,
  consentTemplateParamsSchema,
  createConsentTemplateSchema,
  createFromCatalogSchema,
  createSignedConsentSchema,
  listConsentTemplatesQuerySchema,
  listSignedConsentsQuerySchema,
  patientConsentsParamsSchema,
  signedConsentParamsSchema,
  updateConsentTemplateSchema,
  voidSignedConsentSchema,
} from './consent.schemas';
import { ConsentService, ConsentServiceDependencies } from './consent.service';

export const createConsentRouter = (identity: IdentityService, dependencies: ConsentServiceDependencies = {}) => {
  const router = Router();
  const controller = createConsentController(new ConsentService(dependencies));
  router.use(
    ['/consent-catalog', '/consent-templates', '/patients/:patientId/signed-consents'],
    noStore,
    authenticate(identity)
  );
  router.get('/consent-catalog', controller.catalog);
  router.get('/consent-templates', validateRequest({ query: listConsentTemplatesQuerySchema }), controller.listTemplates);
  router.post('/consent-templates', validateRequest({ body: createConsentTemplateSchema }), controller.createTemplate);
  router.post('/consent-templates/from-catalog', validateRequest({ body: createFromCatalogSchema }), controller.fromCatalog);
  router.get('/consent-templates/:templateId', validateRequest({ params: consentTemplateParamsSchema }), controller.getTemplate);
  router.patch('/consent-templates/:templateId', validateRequest({ params: consentTemplateParamsSchema, body: updateConsentTemplateSchema }), controller.updateTemplate);
  router.delete('/consent-templates/:templateId', validateRequest({ params: consentTemplateParamsSchema }), controller.archiveTemplate);
  router.post('/consent-templates/:templateId/restore', validateRequest({ params: consentTemplateParamsSchema }), controller.restoreTemplate);
  router.get('/patients/:patientId/signed-consents', validateRequest({ params: patientConsentsParamsSchema, query: listSignedConsentsQuerySchema }), controller.listSigned);
  router.post('/patients/:patientId/signed-consents', validateRequest({ params: patientConsentsParamsSchema, body: createSignedConsentSchema }), controller.createSigned);
  router.get('/patients/:patientId/signed-consents/:consentId', validateRequest({ params: signedConsentParamsSchema }), controller.getSigned);
  router.put('/patients/:patientId/signed-consents/:consentId/document', validateRequest({ params: signedConsentParamsSchema, body: attachSignedDocumentSchema }), controller.attachDocument);
  router.post('/patients/:patientId/signed-consents/:consentId/void', validateRequest({ params: signedConsentParamsSchema, body: voidSignedConsentSchema }), controller.voidConsent);
  router.use(consentErrorHandler);
  return router;
};
