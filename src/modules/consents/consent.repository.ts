import { Op, Transaction, WhereOptions } from 'sequelize';

import db from '../../db/connection';
import InformedConsent from '../../models/informed-consent.model';
import Patient from '../../models/patient.model';
import SignedConsent from '../../models/signed-consent.model';
import StoredFile from '../../models/stored-file.model';
import UserInformedConsent from '../../models/user-informed-consent.model';
import User from '../../models/user.model';
import type {
  CreateConsentTemplateInput,
  CreateFromCatalogInput,
  CreateSignedConsentInput,
  ListConsentTemplatesQuery,
  ListSignedConsentsQuery,
  UpdateConsentTemplateInput,
} from './consent.schemas';
import { ConsentError, ConsentTemplateData, SignedConsentData } from './consent.types';

const filePublicId = async (id: number | null, known?: Map<number, string>): Promise<string | null> => {
  if (!id) return null;
  if (known) return known.get(id) ?? null;
  return (await StoredFile.findByPk(id, { attributes: ['public_id'] }))?.public_id ?? null;
};

const loadFilePublicIds = async (ids: Array<number | null>) => {
  const unique = [...new Set(ids.filter((id): id is number => id !== null))];
  if (!unique.length) return new Map<number, string>();
  const files = await StoredFile.findAll({ where: { id: { [Op.in]: unique } }, attributes: ['id', 'public_id'] });
  return new Map(files.map((file) => [file.id, file.public_id]));
};

const mapTemplate = async (value: UserInformedConsent, files?: Map<number, string>): Promise<ConsentTemplateData> => ({
  id: value.id,
  userId: value.user_id,
  catalogId: value.informed_consent_id,
  name: value.name,
  description: value.description,
  isCustom: value.is_custom,
  templateFileId: await filePublicId(value.template_file_id, files),
  status: value.status,
  version: value.version,
  archivedAt: value.archived_at,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
});

const mapSigned = async (value: SignedConsent, files?: Map<number, string>): Promise<SignedConsentData> => ({
  id: value.id,
  patientId: value.patient_id,
  templateId: value.user_informed_consent_id,
  templateFileId: await filePublicId(value.template_file_id_snapshot, files),
  signedDocumentFileId: await filePublicId(value.signed_file_id, files),
  status: value.status,
  signedAt: value.signed_at,
  templateVersion: value.template_version,
  templateName: value.template_name_snapshot,
  templateDescription: value.template_description_snapshot,
  patientName: value.patient_name_snapshot,
  doctorName: value.doctor_name_snapshot,
  signatoryName: value.signatory_name,
  signatoryCapacity: value.signatory_capacity,
  voidedAt: value.voided_at,
  voidReason: value.void_reason,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
});

const fullName = (...parts: Array<string | null | undefined>) => parts.map((part) => part?.trim()).filter(Boolean).join(' ');

export class SequelizeConsentRepository {
  async listCatalog() {
    const rows = await InformedConsent.findAll({ order: [['name', 'ASC'], ['id', 'ASC']] });
    return rows.map((row) => ({ id: row.id, name: row.name, description: row.description }));
  }

  async listTemplates(userId: number, query: ListConsentTemplatesQuery) {
    const where: WhereOptions = {
      user_id: userId,
      ...(query.status === 'active' && { status: 'ACTIVE' }),
      ...(query.status === 'archived' && { status: 'ARCHIVED' }),
    };
    const { count, rows } = await UserInformedConsent.findAndCountAll({
      where,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
    });
    const files = await loadFilePublicIds(rows.map((row) => row.template_file_id));
    return { templates: await Promise.all(rows.map((row) => mapTemplate(row, files))), total: count };
  }

  async findTemplate(userId: number, templateId: number) {
    const value = await UserInformedConsent.findOne({ where: { id: templateId, user_id: userId } });
    return value ? mapTemplate(value) : null;
  }

  async createTemplate(userId: number, input: CreateConsentTemplateInput, fileId: number | null) {
    const value = await db.transaction(async (transaction) => {
      if (fileId) await this.requireFile(userId, fileId, 'CONSENT_TEMPLATE', transaction);
      return UserInformedConsent.create({
        user_id: userId,
        informed_consent_id: null,
        name: input.name,
        description: input.description,
        is_custom: true,
        template_file_id: fileId,
      }, { transaction });
    });
    return mapTemplate(value);
  }

  async createFromCatalog(userId: number, input: CreateFromCatalogInput, fileId: number | null) {
    try {
      const value = await db.transaction(async (transaction) => {
        const catalog = await InformedConsent.findByPk(input.catalogId, { transaction });
        if (!catalog) throw new ConsentError('CONSENT_TEMPLATE_NOT_FOUND', 'Plantilla de catalogo no encontrada');
        if (fileId) await this.requireFile(userId, fileId, 'CONSENT_TEMPLATE', transaction);
        return UserInformedConsent.create({
          user_id: userId,
          informed_consent_id: catalog.id,
          name: catalog.name,
          description: catalog.description,
          is_custom: false,
          template_file_id: fileId,
        }, { transaction });
      });
      return mapTemplate(value);
    } catch (error) {
      if (typeof error === 'object' && error && 'name' in error && error.name === 'SequelizeUniqueConstraintError') {
        throw new ConsentError('CONSENT_TEMPLATE_DUPLICATE', 'La plantilla ya pertenece al usuario');
      }
      throw error;
    }
  }

  async updateTemplate(userId: number, templateId: number, input: UpdateConsentTemplateInput, fileId: number | null | undefined) {
    await db.transaction(async (transaction) => {
      const template = await this.lockTemplate(userId, templateId, transaction);
      if (template.status === 'ARCHIVED') throw new ConsentError('CONSENT_TEMPLATE_ARCHIVED', 'La plantilla esta archivada');
      if (fileId) await this.requireFile(userId, fileId, 'CONSENT_TEMPLATE', transaction);
      await template.update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(fileId !== undefined && { template_file_id: fileId }),
        version: template.version + 1,
      }, { transaction });
    });
    return (await this.findTemplate(userId, templateId))!;
  }

  async setTemplateArchived(userId: number, templateId: number, archived: boolean) {
    await db.transaction(async (transaction) => {
      const template = await this.lockTemplate(userId, templateId, transaction);
      if ((archived && template.status === 'ARCHIVED') || (!archived && template.status === 'ACTIVE')) return;
      await template.update({
        status: archived ? 'ARCHIVED' : 'ACTIVE',
        archived_at: archived ? new Date() : null,
        version: template.version + 1,
      }, { transaction });
    });
    return (await this.findTemplate(userId, templateId))!;
  }

  async listSigned(userId: number, patientId: number, query: ListSignedConsentsQuery) {
    if (!(await this.patientExists(userId, patientId))) return null;
    const where: WhereOptions = {
      doctor_id: userId,
      patient_id: patientId,
      ...(query.status !== 'all' && { status: query.status }),
    };
    const { count, rows } = await SignedConsent.findAndCountAll({
      where,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [['signed_at', 'DESC'], ['id', 'DESC']],
    });
    const files = await loadFilePublicIds(rows.flatMap((row) => [row.template_file_id_snapshot, row.signed_file_id]));
    return { consents: await Promise.all(rows.map((row) => mapSigned(row, files))), total: count };
  }

  async findSigned(userId: number, patientId: number, consentId: number) {
    if (!(await this.patientExists(userId, patientId))) return null;
    const value = await SignedConsent.findOne({ where: { id: consentId, doctor_id: userId, patient_id: patientId } });
    return value ? mapSigned(value) : null;
  }

  async createSigned(userId: number, patientId: number, input: CreateSignedConsentInput, signedFileId: number | null) {
    let id = 0;
    await db.transaction(async (transaction) => {
      const patient = await Patient.findOne({ where: { id: patientId, user_id: userId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!patient) throw new ConsentError('PATIENT_NOT_FOUND', 'Paciente no encontrado');
      const template = await this.lockTemplate(userId, input.templateId, transaction);
      if (template.status !== 'ACTIVE') throw new ConsentError('CONSENT_TEMPLATE_ARCHIVED', 'La plantilla esta archivada');
      if (template.template_file_id) await this.requireFile(userId, template.template_file_id, 'CONSENT_TEMPLATE', transaction);
      if (signedFileId) await this.requireFile(userId, signedFileId, 'SIGNED_CONSENT', transaction);
      const doctor = await User.findByPk(userId, { transaction });
      if (!doctor) throw new ConsentError('PATIENT_NOT_FOUND', 'Usuario no encontrado');
      const value = await SignedConsent.create({
        user_informed_consent_id: template.id,
        patient_id: patient.id,
        doctor_id: userId,
        signed_at: new Date(input.signedAt),
        template_file_id_snapshot: template.template_file_id,
        signed_file_id: signedFileId,
        status: signedFileId ? 'COMPLETED' : 'PENDING_DOCUMENT',
        template_version: template.version,
        template_name_snapshot: template.name,
        template_description_snapshot: template.description,
        patient_name_snapshot: fullName(patient.name, patient.middle_name, patient.last_name),
        doctor_name_snapshot: fullName(doctor.name, doctor.middle_name, doctor.last_name),
        signatory_name: input.signatoryName,
        signatory_capacity: input.signatoryCapacity,
      }, { transaction });
      id = value.id;
    });
    return (await this.findSigned(userId, patientId, id))!;
  }

  async attachDocument(userId: number, patientId: number, consentId: number, fileId: number) {
    await db.transaction(async (transaction) => {
      await this.requirePatient(userId, patientId, transaction);
      const consent = await this.lockSigned(userId, patientId, consentId, transaction);
      if (consent.status === 'VOIDED') throw new ConsentError('CONSENT_VOIDED', 'El consentimiento esta anulado');
      if (consent.signed_file_id) throw new ConsentError('CONSENT_DOCUMENT_ATTACHED', 'El documento firmado ya fue adjuntado');
      await this.requireFile(userId, fileId, 'SIGNED_CONSENT', transaction);
      await consent.update({ signed_file_id: fileId, status: 'COMPLETED' }, { transaction });
    });
    return (await this.findSigned(userId, patientId, consentId))!;
  }

  async void(userId: number, patientId: number, consentId: number, reason: string) {
    await db.transaction(async (transaction) => {
      await this.requirePatient(userId, patientId, transaction);
      const consent = await this.lockSigned(userId, patientId, consentId, transaction);
      if (consent.status === 'VOIDED') return;
      await consent.update({ status: 'VOIDED', voided_at: new Date(), void_reason: reason }, { transaction });
    });
    return (await this.findSigned(userId, patientId, consentId))!;
  }

  private async requireFile(userId: number, id: number, purpose: 'CONSENT_TEMPLATE' | 'SIGNED_CONSENT', transaction: Transaction) {
    const file = await StoredFile.findOne({ where: { id, user_id: userId, purpose, status: 'AVAILABLE' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!file) throw new ConsentError('CONSENT_TEMPLATE_NOT_FOUND', 'Archivo no encontrado');
  }

  private async lockTemplate(userId: number, id: number, transaction: Transaction) {
    const value = await UserInformedConsent.findOne({ where: { id, user_id: userId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!value) throw new ConsentError('CONSENT_TEMPLATE_NOT_FOUND', 'Plantilla no encontrada');
    return value;
  }

  private async patientExists(userId: number, patientId: number) {
    return (await Patient.count({ where: { id: patientId, user_id: userId } })) > 0;
  }

  private async requirePatient(userId: number, patientId: number, transaction: Transaction) {
    const patient = await Patient.findOne({ where: { id: patientId, user_id: userId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!patient) throw new ConsentError('PATIENT_NOT_FOUND', 'Paciente no encontrado');
  }

  private async lockSigned(userId: number, patientId: number, consentId: number, transaction: Transaction) {
    const value = await SignedConsent.findOne({ where: { id: consentId, doctor_id: userId, patient_id: patientId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!value) throw new ConsentError('CONSENT_NOT_FOUND', 'Consentimiento no encontrado');
    return value;
  }
}
