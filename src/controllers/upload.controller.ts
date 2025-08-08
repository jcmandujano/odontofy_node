// src/controllers/upload.controller.ts
import { Request, Response } from 'express';
import bucket from '../googleStorageClient';
import { GetSignedUrlConfig } from '@google-cloud/storage';
import { errorResponse, successResponse } from '../utils/response';

/**
 * Handles file upload requests, saving the uploaded file to Google Cloud Storage.
 *
 * @param req - Express request object, expected to contain a file (in `req.file`) and `authorUid` property.
 * @param res - Express response object used to send the HTTP response.
 * @returns A JSON response indicating success or failure of the upload operation.
 *
 * @remarks
 * - The uploaded file is stored in the `storage/` directory with a unique filename based on the current timestamp and `authorUid`.
 * - Only PDF files are expected, as the filename ends with `.pdf`.
 * - Responds with HTTP 400 if no file is provided.
 * - Responds with HTTP 500 on upload or internal errors.
 */
export const uploadFile = async (req: Request, res: Response) => {
    const { authorUid } = req
    try {

        if (!req.file) {
            return res.status(400).json({ ok: false, msg: 'No se envió ningún archivo' });
        }

        const file = req.file;
        const filePath = `storage/${Date.now()}-${authorUid}.pdf`;
        const gcsFile = bucket.file(filePath);

        const stream = gcsFile.createWriteStream({
            resumable: false,
            contentType: file.mimetype,
            metadata: {
                contentType: file.mimetype,
            },
        });

        stream.on('error', (err) => {
            console.error('Error al subir archivo:', err);
            return res.status(500).json({ ok: false, msg: 'Error al subir archivo' });
        });

        stream.on('finish', async () => {
            return successResponse(res, filePath, "File created successfully");
        });

        stream.end(file.buffer);
    } catch (error) {
        console.error('Error general al subir archivo:', error);
        return errorResponse(res, 'Internal error on upload file', 500, error);
    }
};

/**
 * Handles the generation of a signed URL for accessing a file stored in a cloud bucket.
 *
 * @param req - Express request object, expects `filePath` as a route parameter.
 * @param res - Express response object used to send the result.
 * @returns A JSON response containing the signed URL if the file exists, or an error message otherwise.
 *
 * @remarks
 * - Checks if the specified file exists in the bucket before generating the signed URL.
 * - The signed URL is valid for 1 hour.
 * - Responds with appropriate HTTP status codes for missing parameters, file not found, or internal errors.
 */
export const getSignedFileUrl = async (req: Request, res: Response) => {
    try {
        const { filePath } = req.params;

        if (!filePath) {
            return res.status(400).json({ ok: false, msg: 'No se especificó el archivo' });
        }

        const file = bucket.file(filePath);

        // ✅ Verificamos si el archivo existe en el bucket
        const [exists] = await file.exists();

        if (!exists) {
            return errorResponse(res, 'File not found', 404);
        }

        // ✅ Generar URL firmada sólo si existe
        const options: GetSignedUrlConfig = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 1 hora
        };

        const [url] = await file.getSignedUrl(options);

        return successResponse(res, url, "File URL generated successfully");

    } catch (error) {
        console.error('Error al generar URL firmada:', error);
        return errorResponse(res, 'Error on generate file url', 500, error);
    }
};

