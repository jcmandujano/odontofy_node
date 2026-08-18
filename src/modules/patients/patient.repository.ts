import { Op, WhereOptions } from 'sequelize';

import Patient from '../../models/patient.model';
import {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from './patient.schemas';
import {
  PatientData,
  PatientPage,
  PatientSummaryData,
} from './patient.types';

const balance = (value: string | number): string =>
  typeof value === 'number' ? value.toFixed(2) : value;

const mapPatient = (patient: Patient): PatientData => ({
  id: patient.id,
  name: patient.name,
  middleName: patient.middle_name,
  lastName: patient.last_name,
  gender: patient.gender,
  dateOfBirth: patient.date_of_birth,
  phone: patient.phone,
  maritalStatus: patient.marital_status,
  occupation: patient.occupation,
  address: patient.address,
  emergencyContactName: patient.emergency_contact_name,
  emergencyContactPhone: patient.emergency_contact_phone,
  emergencyContactRelationship: patient.emergency_contact_relationship,
  reasonForConsultation: patient.reason_for_consultation,
  rfc: patient.rfc,
  familyMedicalHistory: patient.family_medical_history,
  personalMedicalHistory: patient.personal_medical_history,
  email: patient.email,
  active: patient.status,
  currentBalance: balance(patient.debt),
  createdAt: patient.createdAt,
  updatedAt: patient.updatedAt,
});

const mapPatientSummary = (patient: Patient): PatientSummaryData => ({
  id: patient.id,
  name: patient.name,
  middleName: patient.middle_name,
  lastName: patient.last_name,
  dateOfBirth: patient.date_of_birth,
  phone: patient.phone,
  email: patient.email,
  active: patient.status,
  currentBalance: balance(patient.debt),
  createdAt: patient.createdAt,
});

const toDate = (value: string | null): Date | null =>
  value ? new Date(`${value}T00:00:00.000Z`) : null;

const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`);

export interface PatientRepository {
  list(userId: number, query: ListPatientsQuery): Promise<PatientPage>;
  findById(userId: number, patientId: number): Promise<PatientData | null>;
  create(userId: number, input: CreatePatientInput): Promise<PatientData>;
  update(
    userId: number,
    patientId: number,
    input: UpdatePatientInput
  ): Promise<PatientData | null>;
  archive(userId: number, patientId: number): Promise<boolean>;
}

export class SequelizePatientRepository implements PatientRepository {
  async list(
    userId: number,
    query: ListPatientsQuery
  ): Promise<PatientPage> {
    const pattern = `%${escapeLike(query.search)}%`;
    const where: WhereOptions = {
      user_id: userId,
      ...(query.status !== 'all' && {
        status: query.status === 'active',
      }),
      ...(query.search && {
        [Op.or]: [
          { name: { [Op.like]: pattern } },
          { middle_name: { [Op.like]: pattern } },
          { last_name: { [Op.like]: pattern } },
        ],
      }),
    };

    const { count, rows } = await Patient.findAndCountAll({
      where,
      attributes: [
        'id',
        'name',
        'middle_name',
        'last_name',
        'date_of_birth',
        'phone',
        'email',
        'status',
        'debt',
        'createdAt',
      ],
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    return { patients: rows.map(mapPatientSummary), total: count };
  }

  async findById(
    userId: number,
    patientId: number
  ): Promise<PatientData | null> {
    const patient = await Patient.findOne({
      where: { id: patientId, user_id: userId },
    });
    return patient ? mapPatient(patient) : null;
  }

  async create(
    userId: number,
    input: CreatePatientInput
  ): Promise<PatientData> {
    const patient = await Patient.create({
      user_id: userId,
      name: input.name,
      middle_name: input.middleName,
      last_name: input.lastName,
      gender: input.gender,
      date_of_birth: toDate(input.dateOfBirth),
      phone: input.phone,
      marital_status: input.maritalStatus,
      occupation: input.occupation,
      address: input.address,
      emergency_contact_name: input.emergencyContactName,
      emergency_contact_phone: input.emergencyContactPhone,
      emergency_contact_relationship: input.emergencyContactRelationship,
      reason_for_consultation: input.reasonForConsultation,
      rfc: input.rfc,
      family_medical_history: { schemaVersion: '1.0', summary: null },
      personal_medical_history: {
        schemaVersion: '1.0',
        answers: [],
        otherNotes: null,
      },
      email: input.email,
      status: true,
      debt: 0,
    });
    return mapPatient(patient);
  }

  async update(
    userId: number,
    patientId: number,
    input: UpdatePatientInput
  ): Promise<PatientData | null> {
    const patient = await Patient.findOne({
      where: { id: patientId, user_id: userId },
    });
    if (!patient) return null;

    await patient.update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.middleName !== undefined && {
        middle_name: input.middleName,
      }),
      ...(input.lastName !== undefined && { last_name: input.lastName }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.dateOfBirth !== undefined && {
        date_of_birth: toDate(input.dateOfBirth),
      }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.maritalStatus !== undefined && {
        marital_status: input.maritalStatus,
      }),
      ...(input.occupation !== undefined && { occupation: input.occupation }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.emergencyContactName !== undefined && {
        emergency_contact_name: input.emergencyContactName,
      }),
      ...(input.emergencyContactPhone !== undefined && {
        emergency_contact_phone: input.emergencyContactPhone,
      }),
      ...(input.emergencyContactRelationship !== undefined && {
        emergency_contact_relationship: input.emergencyContactRelationship,
      }),
      ...(input.reasonForConsultation !== undefined && {
        reason_for_consultation: input.reasonForConsultation,
      }),
      ...(input.rfc !== undefined && { rfc: input.rfc }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.active !== undefined && { status: input.active }),
    });
    return mapPatient(patient);
  }

  async archive(userId: number, patientId: number): Promise<boolean> {
    const patient = await Patient.findOne({
      where: { id: patientId, user_id: userId },
    });
    if (!patient) return false;

    if (patient.status) await patient.update({ status: false });
    return true;
  }
}
