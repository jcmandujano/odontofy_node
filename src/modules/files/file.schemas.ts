import { z } from 'zod';

import { filePurposes } from '../../models/stored-file.model';

export const fileParamsSchema = z.strictObject({ fileId: z.uuid() });
export const uploadFileSchema = z.strictObject({ purpose: z.enum(filePurposes) });

export type FileParams = z.infer<typeof fileParamsSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
