import type {
  AttachSignedDocumentInput,
  CreateConsentTemplateInput,
  CreateFromCatalogInput,
  CreateSignedConsentInput,
  ListConsentTemplatesQuery,
  ListSignedConsentsQuery,
  UpdateConsentTemplateInput,
  VoidSignedConsentInput,
} from './consent.schemas';
import { SequelizeConsentRepository } from './consent.repository';
import type { ConsentTemplateData, SignedConsentData } from './consent.types';
import { ConsentError } from './consent.types';
import { FileService, FileServiceDependencies } from '../files/file.service';

const templateView = (value: ConsentTemplateData) => ({
  id: value.id,
  catalogId: value.catalogId,
  name: value.name,
  description: value.description,
  source: value.isCustom ? 'CUSTOM' as const : 'CATALOG' as const,
  templateFileId: value.templateFileId,
  status: value.status,
  version: value.version,
  archivedAt: value.archivedAt?.toISOString() ?? null,
  createdAt: value.createdAt.toISOString(),
  updatedAt: value.updatedAt.toISOString(),
});

const signedView = (value: SignedConsentData) => ({
  id: value.id,
  patientId: value.patientId,
  template: {
    id: value.templateId,
    version: value.templateVersion,
    name: value.templateName,
    description: value.templateDescription,
    fileId: value.templateFileId,
  },
  signedDocumentFileId: value.signedDocumentFileId,
  status: value.status,
  signedAt: value.signedAt.toISOString(),
  patientName: value.patientName,
  doctorName: value.doctorName,
  signatory: { name: value.signatoryName, capacity: value.signatoryCapacity },
  voidedAt: value.voidedAt?.toISOString() ?? null,
  voidReason: value.voidReason,
  createdAt: value.createdAt.toISOString(),
  updatedAt: value.updatedAt.toISOString(),
});

export interface ConsentServiceDependencies {
  clock?: () => Date;
  files?: FileServiceDependencies;
  repository?: SequelizeConsentRepository;
}

export class ConsentService {
  private readonly clock: () => Date;
  private readonly files: FileService;
  private readonly repository: SequelizeConsentRepository;

  constructor(dependencies: ConsentServiceDependencies = {}) {
    this.clock = dependencies.clock ?? (() => new Date());
    this.files = new FileService(dependencies.files);
    this.repository = dependencies.repository ?? new SequelizeConsentRepository();
  }

  listCatalog() {
    return this.repository.listCatalog();
  }

  async listTemplates(userId: number, query: ListConsentTemplatesQuery) {
    const result = await this.repository.listTemplates(userId, query);
    return {
      templates: result.templates.map(templateView),
      pagination: this.pagination(query.page, query.pageSize, result.total),
    };
  }

  async getTemplate(userId: number, templateId: number) {
    const value = await this.repository.findTemplate(userId, templateId);
    if (!value) throw new ConsentError('CONSENT_TEMPLATE_NOT_FOUND', 'Plantilla no encontrada');
    return templateView(value);
  }

  async createTemplate(userId: number, input: CreateConsentTemplateInput) {
    const file = input.templateFileId
      ? await this.files.requireAvailable(userId, input.templateFileId, 'CONSENT_TEMPLATE')
      : null;
    return templateView(await this.repository.createTemplate(userId, input, file?.id ?? null));
  }

  async createFromCatalog(userId: number, input: CreateFromCatalogInput) {
    const file = input.templateFileId
      ? await this.files.requireAvailable(userId, input.templateFileId, 'CONSENT_TEMPLATE')
      : null;
    return templateView(await this.repository.createFromCatalog(userId, input, file?.id ?? null));
  }

  async updateTemplate(userId: number, templateId: number, input: UpdateConsentTemplateInput) {
    const fileId = input.templateFileId === undefined
      ? undefined
      : input.templateFileId === null
        ? null
        : (await this.files.requireAvailable(userId, input.templateFileId, 'CONSENT_TEMPLATE')).id;
    return templateView(await this.repository.updateTemplate(userId, templateId, input, fileId));
  }

  async setTemplateArchived(userId: number, templateId: number, archived: boolean) {
    return templateView(await this.repository.setTemplateArchived(userId, templateId, archived));
  }

  async listSigned(userId: number, patientId: number, query: ListSignedConsentsQuery) {
    const result = await this.repository.listSigned(userId, patientId, query);
    if (!result) throw new ConsentError('PATIENT_NOT_FOUND', 'Paciente no encontrado');
    return {
      consents: result.consents.map(signedView),
      pagination: this.pagination(query.page, query.pageSize, result.total),
    };
  }

  async getSigned(userId: number, patientId: number, consentId: number) {
    const value = await this.repository.findSigned(userId, patientId, consentId);
    if (!value) throw new ConsentError('CONSENT_NOT_FOUND', 'Consentimiento no encontrado');
    return signedView(value);
  }

  async createSigned(userId: number, patientId: number, input: CreateSignedConsentInput) {
    if (new Date(input.signedAt).getTime() > this.clock().getTime() + 5 * 60_000) {
      throw new ConsentError('CONSENT_INVALID_DATE', 'La fecha de firma no puede estar en el futuro');
    }
    const file = input.signedDocumentFileId
      ? await this.files.requireAvailable(userId, input.signedDocumentFileId, 'SIGNED_CONSENT')
      : null;
    return signedView(await this.repository.createSigned(userId, patientId, input, file?.id ?? null));
  }

  async attachDocument(userId: number, patientId: number, consentId: number, input: AttachSignedDocumentInput) {
    const file = await this.files.requireAvailable(userId, input.signedDocumentFileId, 'SIGNED_CONSENT');
    return signedView(await this.repository.attachDocument(userId, patientId, consentId, file.id));
  }

  async void(userId: number, patientId: number, consentId: number, input: VoidSignedConsentInput) {
    return signedView(await this.repository.void(userId, patientId, consentId, input.reason));
  }

  private pagination(page: number, pageSize: number, total: number) {
    return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }
}
