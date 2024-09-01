import { Request, Response } from "express"
import SignedConsent from "../models/signed-consent.model"

export const listSignedConsents = async (req: Request, res: Response) => {
    const { authorUid } = req;

    const signedConsents = await SignedConsent.findAll({
        where:{
            doctor_id: authorUid
        }
    });

    res.json({
        data: signedConsents
    })
}

export const getSignedConsent= async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;

    const signedConsent = await SignedConsent.findOne({
        where:{
            id: id,
            doctor_id: authorUid
        }
    });

    if(signedConsent){
        res.json({
            data: signedConsent
        })
    }else{
        res.status(404).json({
            msg: 'El consentimiento informado no ha sido encontrado'
        })
    }

}

export const createSignedConsents= async (req: Request, res: Response) => {
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

export const updateSignedConsents= async (req: Request, res: Response) => {
    const { id } = req.params;
    const { body, authorUid } = req;
    try {
        const signedConsent = await SignedConsent.findOne({
            where: {
                id: id,
                doctor_id: authorUid
            }
          });
        if(!signedConsent){
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

export const deleteSignedConsents= async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    try {
        const signedConsent = await SignedConsent.findOne({
            where: {
                id: id,
                doctor_id: authorUid
            }
          });
        if(!signedConsent){
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