import { createHash } from 'node:crypto'
import { Op, Transaction, UniqueConstraintError } from 'sequelize'
import db from '../../db/connection'
import Odontogram from '../../models/odontogram.model'
import OdontogramFinding from '../../models/odontogram-finding.model'
import FindingTreatment from '../../models/odontogram-finding-treatment-item.model'
import Patient from '../../models/patient.model'
import TreatmentPlan from '../../models/treatment-plan.model'
import TreatmentPlanItem from '../../models/treatment-plan-item.model'
import TreatmentCharge from '../../models/treatment-charge.model'
import { amount, cents } from '../../platform/finance-money'
import { ApiError } from '../../platform/http/api-error'
import type { CreateOdontogramPlanInput } from './odontogram-plan.schemas'

const fail = (code: string, message: string, statusCode = 409): never => {
  throw new ApiError({ code, message, statusCode })
}
const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
const ownedChart = async (
  userId: number,
  chartId: number,
  transaction?: Transaction
) => {
  const chart = await Odontogram.findOne({
    where: { id: chartId, user_id: userId },
    transaction,
    ...(transaction && { lock: transaction.LOCK.UPDATE }),
  })
  return chart ?? fail('ODONTOGRAM_NOT_FOUND', 'Odontograma no encontrado', 404)
}

export class OdontogramPlanRepository {
  private async candidates(chart: Odontogram, transaction?: Transaction) {
    const findings = await OdontogramFinding.findAll({
      where: { odontogram_id: chart.id },
      order: [['id', 'ASC']],
      transaction,
    })
    const byFinding = new Map(findings.map((finding) => [finding.id, finding]))
    const links = findings.length
      ? await FindingTreatment.findAll({
          where: { finding_id: findings.map((finding) => finding.id) },
          transaction,
        })
      : []
    const ids = [
      ...new Set(links.map((link) => link.treatment_plan_item_id)),
    ].sort((a, b) => a - b)
    const items = ids.length
      ? await TreatmentPlanItem.findAll({
          where: { id: ids, patient_id: chart.patient_id },
          order: [['id', 'ASC']],
          transaction,
          ...(transaction && { lock: transaction.LOCK.UPDATE }),
        })
      : []
    const charges = ids.length
      ? await TreatmentCharge.findAll({
          where: { treatment_id: ids, patient_id: chart.patient_id },
          transaction,
        })
      : []
    const charged = new Set(charges.map((charge) => charge.treatment_id))
    return items.map((item) => {
      const refs = links
        .filter((link) => link.treatment_plan_item_id === item.id)
        .map((link) => byFinding.get(link.finding_id)!)
        .sort((a, b) => a.id - b.id)
        .map((finding) => ({
          findingId: finding.id,
          toothCode: finding.tooth_code,
          condition: finding.condition,
          surface: finding.surface,
        }))
      const reason =
        item.treatment_plan_id !== null
          ? 'ALREADY_IN_PLAN'
          : item.status === 'CANCELLED'
            ? 'CANCELLED'
            : !item.user_concept_id
              ? 'CATALOG_REQUIRED'
              : item.charge_discount_amount !== null || charged.has(item.id)
                ? 'CHARGE_CONFIRMED'
                : null
      const data = {
        treatmentId: item.id,
        treatmentPlanId: item.treatment_plan_id,
        userConceptId: item.user_concept_id,
        name: item.name,
        tooth: item.tooth,
        area: item.area,
        notes: item.notes,
        clinicalStatus: item.status,
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price),
        subtotal: String(item.subtotal),
        findings: refs,
        reason,
      }
      return { ...data, eligible: reason === null, revision: digest(data) }
    })
  }

  async preview(userId: number, chartId: number) {
    const chart = await ownedChart(userId, chartId)
    return {
      odontogramId: chart.id,
      patientId: chart.patient_id,
      title: chart.title,
      archived: chart.archived_at !== null,
      treatments: await this.candidates(chart),
    }
  }

  async create(
    userId: number,
    chartId: number,
    input: CreateOdontogramPlanInput,
    key: string
  ) {
    const normalized = {
      ...input,
      treatments: [...input.treatments].sort(
        (a, b) => a.treatmentId - b.treatmentId
      ),
    }
    const hash = digest({ userId, chartId, input: normalized })
    // Resolve ownership before acquiring the patient mutex. Keep the transaction's first read locking.
    const original = await ownedChart(userId, chartId)
    return db
      .transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
        async (transaction) => {
          const patient = await Patient.findOne({
            where: { id: original.patient_id, user_id: userId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
          if (!patient)
            return fail('PATIENT_NOT_FOUND', 'Paciente no encontrado', 404)
          const chart = await ownedChart(userId, chartId, transaction)
          const previous = await TreatmentPlan.findOne({
            where: { odontogram_creation_key: key },
            transaction,
          })
          if (previous) {
            if (
              previous.user_id !== userId ||
              previous.patient_id !== patient.id ||
              previous.odontogram_creation_hash !== hash
            )
              return fail(
                'IDEMPOTENCY_KEY_REUSED',
                'La llave ya se utilizó con otros datos. No se duplicó el plan.'
              )
            return { treatmentPlanId: previous.id, patientId: patient.id }
          }
          if (chart.archived_at)
            return fail(
              'ODONTOGRAM_ARCHIVED',
              'Restaura el odontograma antes de generar un plan'
            )
          const candidates = await this.candidates(chart, transaction)
          const selected = normalized.treatments.map((selection) => {
            const candidate = candidates.find(
              (row) => row.treatmentId === selection.treatmentId
            )
            if (!candidate)
              return fail(
                'ODONTOGRAM_TREATMENT_NOT_FOUND',
                'Un tratamiento ya no está asociado a este odontograma. Actualiza la revisión.',
                404
              )
            if (!candidate.eligible)
              return fail(
                'ODONTOGRAM_TREATMENT_NOT_ELIGIBLE',
                'Solo se pueden agrupar tratamientos independientes, del catálogo, no cancelados y sin cargo confirmado.'
              )
            if (candidate.revision !== selection.revision)
              return fail(
                'ODONTOGRAM_PLAN_REVIEW_CHANGED',
                'Un tratamiento cambió después de revisarlo. Actualiza la selección y sus importes.'
              )
            return candidate
          })
          const total = selected.reduce(
            (sum, row) => sum + cents(row.subtotal),
            0n
          )
          if (total > 999_999_999_999n)
            return fail(
              'TREATMENT_PLAN_AMOUNT_LIMIT_EXCEEDED',
              'El importe del plan excede el límite permitido'
            )
          if (cents(input.expectedSubtotal) !== total)
            return fail(
              'ODONTOGRAM_PLAN_REVIEW_CHANGED',
              'El importe revisado no coincide con la selección actual'
            )
          const plan = await TreatmentPlan.create(
            {
              user_id: userId,
              patient_id: patient.id,
              title: input.title,
              description: null,
              diagnosis: null,
              patient_complaint: null,
              clinical_observations: null,
              prognosis: null,
              status: 'DRAFT',
              estimated_start_date: null,
              estimated_end_date: null,
              accepted_at: null,
              rejected_at: null,
              acceptance_notes: null,
              subtotal: amount(total),
              discount: '0.00',
              total: amount(total),
              source_odontogram_id: chartId,
              odontogram_creation_key: key,
              odontogram_creation_hash: hash,
            },
            { transaction }
          )
          // Move the same rows, retaining their links, snapshots, clinical history and advance receipts.
          await TreatmentPlanItem.update(
            { treatment_plan_id: plan.id },
            {
              where: {
                id: { [Op.in]: selected.map((row) => row.treatmentId) },
                patient_id: patient.id,
                treatment_plan_id: null,
              },
              transaction,
            }
          )
          return { treatmentPlanId: plan.id, patientId: patient.id }
        }
      )
      .catch((error) => {
        if (error instanceof UniqueConstraintError)
          return fail(
            'IDEMPOTENCY_KEY_REUSED',
            'La llave ya se utilizó en otra operación. No se duplicó el plan.'
          )
        throw error
      })
  }
}
