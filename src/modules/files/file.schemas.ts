import { z } from 'zod';

import { FILE_PURPOSES } from '../../types/file.enums';

export const fileParamsSchema = z.strictObject({ fileId: z.uuid() });
export const uploadFileSchema = z.strictObject({ purpose: z.enum(FILE_PURPOSES) });

export type FileParams = z.infer<typeof fileParamsSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
