import { createHash } from 'node:crypto'
import { SequelizeTreatmentChargeRepository } from './treatment-charge.repository'
import type {
  ChargeQuery,
  ConfirmChargeInput,
  TreatmentPaymentInput,
} from './treatment-charge.schemas'

export class TreatmentChargeService {
  constructor(
    private readonly repository = new SequelizeTreatmentChargeRepository()
  ) {}
  list(userId: number, patientId: number, query: ChargeQuery) {
    return this.repository.list(userId, patientId, query)
  }
  confirm(
    userId: number,
    patientId: number,
    treatmentId: number,
    input: ConfirmChargeInput
  ) {
    return this.repository.confirm(userId, patientId, treatmentId, input)
  }
  pay(
    userId: number,
    patientId: number,
    input: TreatmentPaymentInput,
    key: string
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ type: 'TREATMENT_PAYMENT', patientId, input }))
      .digest('hex')
    return this.repository.pay(userId, patientId, input, key, hash)
  }
}
