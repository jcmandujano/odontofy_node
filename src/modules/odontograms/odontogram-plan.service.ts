import { OdontogramPlanRepository } from './odontogram-plan.repository'
import type { CreateOdontogramPlanInput } from './odontogram-plan.schemas'

export class OdontogramPlanService {
  constructor(private readonly repository = new OdontogramPlanRepository()) {}
  preview(userId: number, chartId: number) {
    return this.repository.preview(userId, chartId)
  }
  create(
    userId: number,
    chartId: number,
    input: CreateOdontogramPlanInput,
    key: string
  ) {
    return this.repository.create(userId, chartId, input, key)
  }
}
