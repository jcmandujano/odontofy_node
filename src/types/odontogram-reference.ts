import type { OdontogramCondition, OdontogramSurface } from './odontogram.enums'

export interface OdontogramReference {
  odontogramId: number
  findingId: number
  title: string | null
  toothCode: string
  condition: OdontogramCondition
  surface: OdontogramSurface | null
  archived: boolean
}
