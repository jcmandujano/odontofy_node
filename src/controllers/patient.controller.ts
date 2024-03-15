//funciones que se iran llamando eventualmente
import { Request, Response } from "express"
import Patient from "../models/patient.model"

export const listPatient = async (req: Request, res: Response) => {
    const { authorUid } = req;
    const patients = await Patient.findAll({
        where: {
          user_id: authorUid
        }
      });
    
    res.json({
        patients
    })
}

export const getPatient = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    const patient = await Patient.findOne({
        where: {
            id: id,
            user_id: authorUid
        }
      });
    if(patient){
        res.json({
            patient
        })
    }else{
        res.status(404).json({
            msg: 'Paciente no encontrado'
        })
    }
}

export const createPatient = async (req: Request, res: Response) => {
    const { body, authorUid } = req;
    const patient = new Patient(body);
    try {
            patient.user_id = authorUid ? authorUid : 0
            patient.status = true
            const newPatient = await Patient.create(patient.dataValues);
            res.json({
                msg: 'Se creo correctamente al paciente',
                patient: newPatient
            })
        
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}

export const updatePatient = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { body, authorUid } = req;
    try {
        const patient = await Patient.findOne({
            where: {
                id: id,
                user_id: authorUid
            }
          });
        if(!patient){
            return res.status(404).json({
                msg: 'No existe un paciente con el id ' + id
            })
        }
        
        await patient.update(body);
        res.json({
            msg: "El usuario se actualizo correctamente",
            patient
        })

    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}

export const deletePatient = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;
    try {
        const user = await Patient.findOne({
            where: {
                id: id,
                user_id: authorUid
            }
          });
        if(!user){
            return res.status(404).json({
                msg: 'No existe un usuario con el id' + id
            })
        }
        await user.update({status: false});
        res.json({
            msg: 'El usuario ha sido eliminado correctamente'
        })  
          
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
    
}
