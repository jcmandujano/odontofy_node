import { Request, Response } from "express";
import Appointment from "../models/appointment.model";

// Listar citas por paciente
export const listAppointments = async (req: Request, res: Response) => {
    const { authorUid } = req;
    try {
        const appointments = await Appointment.findAll({
            where: {
                user_id: authorUid
            }
        });
        res.json({
            appointments
        });
    } catch (error) {
        res.status(500).json({
            msg: "Ocurrió un problema al realizar tu solicitud",
            error
        });
    }
};

// Obtener una cita específica por ID
export const getAppointment = async (req: Request, res: Response) => {

    const { authorUid } = req;
    const { id } = req.params;
    try {
        const appointment = await Appointment.findOne({
            where: {
                id: id,
                user_id: authorUid,
            }
        });
        if (appointment) {
            res.json({
                appointment
            });
        } else {
            res.status(404).json({
                msg: "Cita no encontrada"
            });
        }
    } catch (error) {
        res.status(500).json({
            msg: "Ocurrió un problema al realizar tu solicitud",
            error
        });
    }
};

// Crear una nueva cita
export const createAppointment = async (req: Request, res: Response) => {
    const patientId = req.params.patient_id;
    const { authorUid } = req;
    const { body } = req;
    try {
        const appointment = new Appointment(body);
        appointment.user_id = authorUid || 0;  
        appointment.patient_id = parseInt(patientId);
        const newAppointment = await Appointment.create(appointment.dataValues);
        res.json({
            msg: "La cita se creó correctamente",
            appointment: newAppointment
        });
    } catch (error) {
        res.status(500).json({
            msg: "Ocurrió un problema al realizar tu solicitud",
            error
        });
    }
};

// Actualizar una cita existente
export const updateAppointment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { body } = req;
    try {
        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({
                msg: "No existe una cita con el id " + id
            });
        }

        await appointment.update(body);
        res.json(appointment);
    } catch (error) {
        res.status(500).json({
            msg: "Ocurrió un problema al realizar tu solicitud",
            error
        });
    }
};

// Eliminar una cita
export const deleteAppointment = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({
                msg: "No existe una cita con el id " + id
            });
        }
        await appointment.destroy();
        res.json({
            msg: "La cita ha sido eliminada correctamente"
        });
    } catch (error) {
        res.status(500).json({
            msg: "Ocurrió un problema al realizar tu solicitud",
            error
        });
    }
};
