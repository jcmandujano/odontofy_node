import OdontogramFinding from '../models/odontogram-finding.model'
import OdontogramFindingTreatmentItem from '../models/odontogram-finding-treatment-item.model'
import Odontogram from '../models/odontogram.model'
import type { OdontogramReference } from '../types/odontogram-reference'

export const withOdontogramReferences = async <T extends { id: number }>(
  userId: number,
  patientId: number,
  items: T[]
): Promise<Array<T & { odontogramReferences: OdontogramReference[] }>> => {
  if (!items.length) return []
  const links = await OdontogramFindingTreatmentItem.findAll({
    where: { treatment_plan_item_id: items.map((item) => item.id) },
    order: [['finding_id', 'ASC']],
  })
  const charts = await Odontogram.findAll({
    where: { user_id: userId, patient_id: patientId },
  })
  const byChart = new Map(charts.map((chart) => [chart.id, chart]))
  const findings =
    links.length && charts.length
      ? await OdontogramFinding.findAll({
          where: {
            id: links.map((link) => link.finding_id),
            odontogram_id: charts.map((chart) => chart.id),
          },
        })
      : []
  const byFinding = new Map(findings.map((finding) => [finding.id, finding]))
  return items.map((item) => ({
    ...item,
    odontogramReferences: links
      .filter(
        (link) =>
          link.treatment_plan_item_id === item.id &&
          byFinding.has(link.finding_id)
      )
      .map((link) => {
        const finding = byFinding.get(link.finding_id)!
        const chart = byChart.get(finding.odontogram_id)!
        return {
          odontogramId: chart.id,
          findingId: finding.id,
          title: chart.title,
          toothCode: finding.tooth_code,
          condition: finding.condition,
          surface: finding.surface,
          archived: chart.archived_at !== null,
        }
      }),
  }))
}
