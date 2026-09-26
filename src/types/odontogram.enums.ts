export const ODONTOGRAM_DENTITIONS = ['ADULT', 'PEDIATRIC'] as const;
export type OdontogramDentition = (typeof ODONTOGRAM_DENTITIONS)[number];

export const ODONTOGRAM_CONDITIONS = [
  'HEALTHY',
  'MISSING',
  'NOT_ERUPTED',
  'RESTORATION',
  'CROWN',
  'ROOT_CANAL',
  'IMPLANT',
  'CARIES',
  'FRACTURE',
  'EXTRACTION_INDICATED',
  'OTHER',
] as const;
export type OdontogramCondition = (typeof ODONTOGRAM_CONDITIONS)[number];

export const ODONTOGRAM_SURFACES = [
  'MESIAL',
  'DISTAL',
  'VESTIBULAR',
  'LINGUAL_PALATAL',
  'OCCLUSAL_INCISAL',
] as const;
export type OdontogramSurface = (typeof ODONTOGRAM_SURFACES)[number];

export const ADULT_TOOTH_CODES = [
  '11', '12', '13', '14', '15', '16', '17', '18',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '31', '32', '33', '34', '35', '36', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48',
] as const;

export const PEDIATRIC_TOOTH_CODES = [
  '51', '52', '53', '54', '55',
  '61', '62', '63', '64', '65',
  '71', '72', '73', '74', '75',
  '81', '82', '83', '84', '85',
] as const;

const adultCodes = new Set<string>(ADULT_TOOTH_CODES);
const pediatricCodes = new Set<string>(PEDIATRIC_TOOTH_CODES);

export const isToothCodeForDentition = (
  dentition: OdontogramDentition,
  toothCode: string
): boolean =>
  dentition === 'ADULT'
    ? adultCodes.has(toothCode)
    : pediatricCodes.has(toothCode);
