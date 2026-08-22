import type { Request, RequestHandler } from 'express';

import { sendSuccess } from '../../platform/http/response';
import { authenticatedUserId } from '../identity/identity.middleware';
import type {
  AttachSignedDocumentInput,
  ConsentTemplateParams,
  CreateConsentTemplateInput,
  CreateFromCatalogInput,
  CreateSignedConsentInput,
  ListConsentTemplatesQuery,
  ListSignedConsentsQuery,
  PatientConsentsParams,
  SignedConsentParams,
  UpdateConsentTemplateInput,
  VoidSignedConsentInput,
} from './consent.schemas';
import { ConsentService } from './consent.service';

const validated = <T>(req: Request, target: 'body' | 'params' | 'query'): T => req.validated?.[target] as T;

export const createConsentController = (service: ConsentService) => {
  const catalog: RequestHandler = async (req, res) => sendSuccess(req, res, await service.listCatalog(), { message: 'Catalogo obtenido' });
  const listTemplates: RequestHandler = async (req, res) => {
    const result = await service.listTemplates(authenticatedUserId(req), validated<ListConsentTemplatesQuery>(req, 'query'));
    return sendSuccess(req, res, result.templates, { message: 'Plantillas obtenidas', meta: { pagination: result.pagination } });
  };
  const getTemplate: RequestHandler = async (req, res) => sendSuccess(req, res,
    await service.getTemplate(authenticatedUserId(req), validated<ConsentTemplateParams>(req, 'params').templateId),
    { message: 'Plantilla obtenida' });
  const createTemplate: RequestHandler = async (req, res) => sendSuccess(req, res,
    await service.createTemplate(authenticatedUserId(req), validated<CreateConsentTemplateInput>(req, 'body')),
    { message: 'Plantilla creada', statusCode: 201 });
  const fromCatalog: RequestHandler = async (req, res) => sendSuccess(req, res,
    await service.createFromCatalog(authenticatedUserId(req), validated<CreateFromCatalogInput>(req, 'body')),
    { message: 'Plantilla agregada', statusCode: 201 });
  const updateTemplate: RequestHandler = async (req, res) => sendSuccess(req, res,
    await service.updateTemplate(authenticatedUserId(req), validated<ConsentTemplateParams>(req, 'params').templateId, validated<UpdateConsentTemplateInput>(req, 'body')),
    { message: 'Plantilla actualizada' });
  const archiveTemplate: RequestHandler = async (req, res) => sendSuccess(req, res,
    await service.setTemplateArchived(authenticatedUserId(req), validated<ConsentTemplateParams>(req, 'params').templateId, true),
    { message: 'Plantilla archivada' });
  const restoreTemplate: RequestHandler = async (req, res) => sendSuccess(req, res,
    await service.setTemplateArchived(authenticatedUserId(req), validated<ConsentTemplateParams>(req, 'params').templateId, false),
    { message: 'Plantilla restaurada' });
  const listSigned: RequestHandler = async (req, res) => {
    const result = await service.listSigned(authenticatedUserId(req), validated<PatientConsentsParams>(req, 'params').patientId, validated<ListSignedConsentsQuery>(req, 'query'));
    return sendSuccess(req, res, result.consents, { message: 'Consentimientos obtenidos', meta: { pagination: result.pagination } });
  };
  const getSigned: RequestHandler = async (req, res) => {
    const params = validated<SignedConsentParams>(req, 'params');
    return sendSuccess(req, res, await service.getSigned(authenticatedUserId(req), params.patientId, params.consentId), { message: 'Consentimiento obtenido' });
  };
  const createSigned: RequestHandler = async (req, res) => sendSuccess(req, res,
    await service.createSigned(authenticatedUserId(req), validated<PatientConsentsParams>(req, 'params').patientId, validated<CreateSignedConsentInput>(req, 'body')),
    { message: 'Consentimiento registrado', statusCode: 201 });
  const attachDocument: RequestHandler = async (req, res) => {
    const params = validated<SignedConsentParams>(req, 'params');
    return sendSuccess(req, res, await service.attachDocument(authenticatedUserId(req), params.patientId, params.consentId, validated<AttachSignedDocumentInput>(req, 'body')), { message: 'Documento firmado adjuntado' });
  };
  const voidConsent: RequestHandler = async (req, res) => {
    const params = validated<SignedConsentParams>(req, 'params');
    return sendSuccess(req, res, await service.void(authenticatedUserId(req), params.patientId, params.consentId, validated<VoidSignedConsentInput>(req, 'body')), { message: 'Consentimiento anulado' });
  };
  return { archiveTemplate, attachDocument, catalog, createSigned, createTemplate, fromCatalog, getSigned, getTemplate, listSigned, listTemplates, restoreTemplate, updateTemplate, voidConsent };
};
