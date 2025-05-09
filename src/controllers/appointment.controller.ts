import { Request, Response } from "express";
import Appointment from "../models/appointment.model";
import { Op } from "sequelize";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, getAuthorizedGoogleClient, listGoogleCalendarEvents, updateGoogleCalendarEvent } from "../utils/googleCalendar";


// Listar citas por paciente, con rango de fechas opcional
export const listAppointments = async (req: Request, res: Response) => {
  const { authorUid } = req;
  const { fromToday = "false" } = req.query;

  try {
    const whereCondition: any = {
      user_id: authorUid,
    };

    if (fromToday === "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const oneMonthLater = new Date();
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

      whereCondition.appointment_date = {
        [Op.between]: [today, oneMonthLater]
      };
    }

    const dbAppointments = await Appointment.findAll({
      where: whereCondition,
      order: [["appointment_date", "ASC"], ["appointment_time", "ASC"]]
    });

    // Obtener eventos de Google Calendar
    let googleEvents: any[] = [];
    const oauth2Client = await getAuthorizedGoogleClient(authorUid!);

    if (oauth2Client) {
      try {
        googleEvents = await listGoogleCalendarEvents(oauth2Client, 30);
      } catch (err) {
        console.warn('No se pudieron obtener eventos de Google Calendar:', err);
      }
    }

    res.json({ appointments: dbAppointments, googleEvents });

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
    const patientId = req.body.patient_id;
    const { authorUid } = req;
    const { body } = req;
  
    try {
      const appointment = new Appointment(body);
      appointment.user_id = authorUid || 0;
      appointment.patient_id = parseInt(patientId);
  
      const newAppointment = await Appointment.create(appointment.dataValues);
  
      // Intentar sincronizar con Google Calendar
      const oauth2Client = await getAuthorizedGoogleClient(authorUid!);
      if (oauth2Client) {
        try {
          const googleEventId = await createGoogleCalendarEvent(oauth2Client, newAppointment);
          // Actualizar el ID del evento de Google Calendar en la cita
          await newAppointment.update({ google_event_id: googleEventId });
          console.log('Evento creado en Google Calendar:', googleEventId);
        } catch (err: any) {
          console.warn('Error al crear evento en Google Calendar:', err.message);
        }
      }
  
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
    const { authorUid } = req;
  
    try {
      const appointment = await Appointment.findByPk(id);
      if (!appointment) {
        return res.status(404).json({
          msg: "No existe una cita con el id " + id
        });
      }
  
      await appointment.update(body);
  
      // Intentar actualizar en Google Calendar
      const oauth2Client = await getAuthorizedGoogleClient(authorUid!);
      if (oauth2Client) {
        try {
          if (appointment.google_event_id) {
            await updateGoogleCalendarEvent(oauth2Client, appointment.google_event_id, appointment);
            console.log('Evento actualizado en Google Calendar');
          } else {
            const googleEventId = await createGoogleCalendarEvent(oauth2Client, appointment);
            await appointment.update({ google_event_id: googleEventId });
            console.log('Evento creado en Google Calendar');
          }
        } catch (err) {
          console.warn('Error al sincronizar con Google Calendar:', err);
        }
      }
  
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
  const { authorUid } = req;

  try {
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({
        msg: "No existe una cita con el id " + id
      });
    }

    // Intentar eliminar en Google Calendar si existe
    const oauth2Client = await getAuthorizedGoogleClient(authorUid!);
    if (oauth2Client && appointment.google_event_id) {
      try {
        await deleteGoogleCalendarEvent(oauth2Client, appointment.google_event_id);
        console.log('Evento eliminado de Google Calendar');
      } catch (err) {
        console.warn('Error al eliminar evento de Google Calendar:', err);
      }
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
