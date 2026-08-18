import {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from './patient.schemas';
import {
  PatientRepository,
  SequelizePatientRepository,
} from './patient.repository';
import {
  PatientData,
  PatientError,
  PatientSummaryData,
  PublicPatient,
  PublicPatientSummary,
} from './patient.types';

const toPublicPatient = (patient: PatientData): PublicPatient => ({
  ...patient,
  dateOfBirth: patient.dateOfBirth
    ? patient.dateOfBirth.toISOString().slice(0, 10)
    : null,
  createdAt: patient.createdAt.toISOString(),
  updatedAt: patient.updatedAt.toISOString(),
});

const toPublicPatientSummary = (
  patient: PatientSummaryData
): PublicPatientSummary => ({
  ...patient,
  dateOfBirth: patient.dateOfBirth
    ? patient.dateOfBirth.toISOString().slice(0, 10)
    : null,
  createdAt: patient.createdAt.toISOString(),
});

export interface PatientServiceDependencies {
  repository?: PatientRepository;
}

export class PatientService {
  private readonly repository: PatientRepository;

  constructor(dependencies: PatientServiceDependencies = {}) {
    this.repository =
      dependencies.repository ?? new SequelizePatientRepository();
  }

  async list(userId: number, query: ListPatientsQuery) {
    const page = await this.repository.list(userId, query);
    return {
      patients: page.patients.map(toPublicPatientSummary),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: page.total,
        totalPages: Math.ceil(page.total / query.pageSize),
      },
    };
  }

  async get(userId: number, patientId: number): Promise<PublicPatient> {
    const patient = await this.repository.findById(userId, patientId);
    if (!patient) throw this.notFound();
    return toPublicPatient(patient);
  }

  async create(
    userId: number,
    input: CreatePatientInput
  ): Promise<PublicPatient> {
    return toPublicPatient(await this.repository.create(userId, input));
  }

  async update(
    userId: number,
    patientId: number,
    input: UpdatePatientInput
  ): Promise<PublicPatient> {
    const patient = await this.repository.update(userId, patientId, input);
    if (!patient) throw this.notFound();
    return toPublicPatient(patient);
  }

  async archive(userId: number, patientId: number): Promise<void> {
    if (!(await this.repository.archive(userId, patientId))) {
      throw this.notFound();
    }
  }

  private notFound(): PatientError {
    return new PatientError('PATIENT_NOT_FOUND', 'Paciente no encontrado');
  }
}
