import { Request, Response } from "express"
import SignedConsent from "../models/signed-consent.model"
import { errorResponse, successResponse } from "../utils/response";
import { PaginatedResponse } from "../types/api-response";
import UserInformedConsent from "../models/user-informed-consent.model";

export const listSignedConsents = async (req: Request, res: Response) => {
    const { authorUid } = req;
    const patientId = req.params.patient_id

    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        if (!patientId) {
            return errorResponse(res, 'Patient ID is required', 400);
        }
        const { count, rows: signedConsents } = await SignedConsent.findAndCountAll({
            where: {
                doctor_id: authorUid,
                patient_id: patientId
            },
            limit,
            offset,
            include: [
                {
                    model: UserInformedConsent,
                    as: 'consent', // debe coincidir con el alias en la relación
                    attributes: ['id', 'name']
                }
            ]
        });

        const response: PaginatedResponse<typeof signedConsents[number]> = {
            total: count,
            page,
            perPage: limit,
            totalPages: Math.ceil(count / limit),
            results: signedConsents
        };

        return successResponse(res, response, 'Signed consents list fetched successfully');
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'An error occurred while fetching the informed consent list', 500, error);
    }
}

export const getSignedConsent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;

    try {
        const signedConsent = await SignedConsent.findOne({
            where: {
                id: id,
                doctor_id: authorUid
            }
        });

        if (signedConsent) {
            res.json({
                data: signedConsent
            })
        } else {
            res.status(404).json({
                msg: 'El consentimiento informado no ha sido encontrado'
            })
        }
    } catch (error) {
        console.error(error);
        return errorResponse(res, `An error occurred while finding the concept with id ${id}`, 500, error);
    }


}

export const createSignedConsents = async (req: Request, res: Response) => {
    const { body, authorUid } = req;
    const signedConsent = new SignedConsent(body);

    try {
        signedConsent.doctor_id = authorUid ? authorUid : 0
        const newSignedConsent = await SignedConsent.create(signedConsent.dataValues);
        res.json({
            msg: 'Se creo correctamente al paciente',
            data: newSignedConsent
        })

    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }

}

export const updateSignedConsents = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { body, authorUid } = req;
    try {
        const signedConsent = await SignedConsent.findOne({
            where: {
                id: id,
                doctor_id: authorUid
            }
        });
        if (!signedConsent) {
            return res.status(404).json({
                msg: 'No existe un consentimiento con el id ' + id
            })
        }

        await signedConsent.update(body);
        res.json({
            msg: "El consentimiento se actualizo correctamente",
            data: signedConsent
        })

    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}

export const deleteSignedConsents = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    try {
        const signedConsent = await SignedConsent.findOne({
            where: {
                id: id,
                doctor_id: authorUid
            }
        });
        if (!signedConsent) {
            return res.status(404).json({
                msg: 'No existe un consentimiento con el id' + id
            })
        }
        await signedConsent.destroy();
        res.json({
            msg: 'El consentimiento ha sido eliminado correctamente'
        })

    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}