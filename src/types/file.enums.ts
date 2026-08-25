export const FILE_PURPOSES = ['CONSENT_TEMPLATE', 'SIGNED_CONSENT'] as const;
export const STORED_FILE_STATUSES = [
  'PENDING',
  'AVAILABLE',
  'DELETING',
  'FAILED',
  'DELETED',
] as const;

export type FilePurpose = (typeof FILE_PURPOSES)[number];
export type StoredFileStatus = (typeof STORED_FILE_STATUSES)[number];
