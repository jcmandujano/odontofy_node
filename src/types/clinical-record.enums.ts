export const EVOLUTION_NOTE_REVISION_ACTIONS = [
  'CREATED',
  'AMENDED',
  'ARCHIVED',
  'RESTORED',
] as const;

export type EvolutionNoteRevisionAction =
  (typeof EVOLUTION_NOTE_REVISION_ACTIONS)[number];
