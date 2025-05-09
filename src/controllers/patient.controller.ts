//funciones que se iran llamando eventualmente
import { Request, Response } from "express"
import Patient from "../models/patient.model"
import { Op } from "sequelize";
import Appointment from "../models/appointment.model";



export const listPatient = async (req: Request, res: Response) => {
    const { authorUid } = req;
    //probaremos el paginado mas adelante
    /*const page = parseInt(req.query.page) || 1; // Página solicitada, por defecto 1
    const limit = parseInt(req.query.limit) || 10; // Límite de resultados por página, por defecto 10
    const offset = (page - 1) * limit; // Desplazamiento en la consulta
    const patients = await Patient.findAndCountAll({
        where: {
            user_id: authorUid
        },
        limit,
        offset
    });

    const totalPages = Math.ceil(patients.count / limit); // Número total de páginas
     */
    const patients = await Patient.findAll({
        where: {
            user_id: authorUid
        },
        include: [
            {
                model: Appointment,
                where: {
                    appointment_date: {
                        [Op.gte]: new Date() // Solo futuras
                    }
                },
                required: false,
                limit: 1,
                order: [['appointment_date', 'ASC']],
                attributes: ['appointment_date', 'appointment_time', 'status']
            }
        ]
    });

    res.json({ patients });
};


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
        await user.destroy();
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
