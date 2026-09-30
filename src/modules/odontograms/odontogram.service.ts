import { isToothCodeForDentition } from '../../types/odontogram.enums';
import {
  CreateOdontogramInput,
  ListOdontogramsQuery,
  UpdateOdontogramInput,
} from './odontogram.schemas';
import {
  OdontogramRepository,
  SequelizeOdontogramRepository,
} from './odontogram.repository';
import {
  OdontogramData,
  OdontogramDetailData,
  OdontogramError,
  OdontogramFindingData,
} from './odontogram.types';

const publicFinding = (finding: OdontogramFindingData) => ({
  ...finding,
  createdAt: finding.createdAt.toISOString(),
  updatedAt: finding.updatedAt.toISOString(),
});

const publicOdontogram = (odontogram: OdontogramData) => ({
  ...odontogram,
  occurredAt: odontogram.occurredAt.toISOString(),
  archivedAt: odontogram.archivedAt?.toISOString() ?? null,
  createdAt: odontogram.createdAt.toISOString(),
  updatedAt: odontogram.updatedAt.toISOString(),
});

const publicDetail = (odontogram: OdontogramDetailData) => ({
  ...publicOdontogram(odontogram),
  findings: odontogram.findings.map(publicFinding),
});

export interface OdontogramServiceDependencies {
  repository?: OdontogramRepository;
}

export class OdontogramService {
  private readonly repository: OdontogramRepository;

  constructor(dependencies: OdontogramServiceDependencies = {}) {
    this.repository =
      dependencies.repository ?? new SequelizeOdontogramRepository();
  }

  async list(
    userId: number,
    patientId: number,
    query: ListOdontogramsQuery
  ) {
    const result = await this.repository.list(userId, patientId, query);
    if (!result) throw this.patientNotFound();
    return {
      odontograms: result.odontograms.map(publicOdontogram),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / query.pageSize),
      },
    };
  }

  async get(userId: number, odontogramId: number) {
    const odontogram = await this.repository.findById(userId, odontogramId);
    if (!odontogram) throw this.odontogramNotFound();
    return publicDetail(odontogram);
  }

  async create(
    userId: number,
    patientId: number,
    input: CreateOdontogramInput
  ) {
    this.validateToothCodes(input.dentition, input.findings);
    return publicDetail(
      await this.repository.create(userId, patientId, input)
    );
  }

  async update(
    userId: number,
    odontogramId: number,
    input: UpdateOdontogramInput
  ) {
    if (input.findings) {
      const current = await this.repository.findById(userId, odontogramId);
      if (!current) throw this.odontogramNotFound();
      this.validateToothCodes(current.dentition, input.findings);
    }
    return publicDetail(
      await this.repository.update(userId, odontogramId, input)
    );
  }

  async archive(userId: number, odontogramId: number) {
    return publicDetail(
      await this.repository.setArchived(userId, odontogramId, true)
    );
  }

  async restore(userId: number, odontogramId: number) {
    return publicDetail(
      await this.repository.setArchived(userId, odontogramId, false)
    );
  }

  private validateToothCodes(
    dentition: 'ADULT' | 'PEDIATRIC',
    findings: Array<{ toothCode: string }>
  ) {
    if (
      findings.some(
        (finding) => !isToothCodeForDentition(dentition, finding.toothCode)
      )
    ) {
      throw new OdontogramError(
        'INVALID_TOOTH_CODE',
        'Una pieza no pertenece a la denticion del odontograma'
      );
    }
  }

  private patientNotFound() {
    return new OdontogramError('PATIENT_NOT_FOUND', 'Paciente no encontrado');
  }

  private odontogramNotFound() {
    return new OdontogramError(
      'ODONTOGRAM_NOT_FOUND',
      'Odontograma no encontrado'
    );
  }
}
