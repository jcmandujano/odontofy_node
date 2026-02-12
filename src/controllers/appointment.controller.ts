/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import Appointment from "../models/appointment.model";
import { Op } from "sequelize";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, getAuthorizedGoogleClient, getValidGoogleClient, listGoogleCalendarEvents, updateGoogleCalendarEvent } from "../utils/googleCalendar";
import { errorResponse, successResponse } from "../utils/response";
import Patient from "../models/patient.model";
import moment from "moment-timezone";


/**
 * Obtener una lista paginada de citas asociadas al usuario autenticado
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con la lista de citas o un mensaje de error
 */
export const listAppointments = async (req: Request, res: Response) => {
  try {
    const { authorUid } = req;
     const { startDate, endDate, timezone } = req.query;

    if (!startDate || !endDate) {
      return errorResponse(res, "El rango de busqueda no es correcto", 400);
    }

    const userTimeZone = timezone ? String(timezone) : "America/Mexico_City";
    if (!moment.tz.zone(userTimeZone)) {
      return errorResponse(res, "Timezone no válido", 400);
    }

    const start = moment.tz(startDate as string, userTimeZone).startOf("day").toDate();
    const end = moment.tz(endDate as string, userTimeZone).endOf("day").toDate();


    // 1. Citas locales (desde BD)
    const dbAppointments = await Appointment.findAll({
      subQuery: false, // evita el UNION ALL
      where: {
        user_id: authorUid,
        appointment_datetime: { [Op.between]: [start, end] },
      },
      include: [{ model: Patient, attributes: ["id", "name"] }],
      order: [["appointment_datetime", "ASC"]],
    });

    // 2. Intentar obtener eventos de Google
    let googleEvents: Appointment[] = [];
    try {
      const oauth2Client = await getValidGoogleClient(authorUid!);
      if (oauth2Client) {
        const events = await listGoogleCalendarEvents(
          oauth2Client,
          start.toISOString(),
          end.toISOString(),
          userTimeZone
        );
        console.log('start :', start.toISOString(), 'end:', end.toISOString());
        console.log(`Obtenidos ${events.length} eventos de Google Calendar`);

        // Convertimos los eventos de Google al formato del modelo Appointment
        googleEvents = events.map((e) => {
          const appointmentDatetime = e.start?.dateTime
            ? new Date(e.start.dateTime)
              : null;
          const appointmentEndDatetime = e.end?.dateTime
          const appointment = Appointment.build({
            id: undefined, // No tiene ID en la BD local
            user_id: authorUid!,
            reason: e.summary || null,
            google_event_id: e.id,
            source: "google", // <- agregamos un campo virtual
            patient_id: null,
            status: "",
            appointment_datetime: appointmentDatetime,
            appointment_end_datetime: appointmentEndDatetime ? new Date(appointmentEndDatetime) : null,
          }) as Appointment & { source?: string };

          // Adjuntamos un paciente "fantasma" si el evento tiene nombre
          (appointment as any).Patient = { id: null, name: e.summary || "Evento de Google" };
          return appointment;
        });
      }
    } catch (err) {
      console.warn("No se pudieron obtener los eventos de Google Calendar:", err);
    }

    // 3. Unificar sin duplicar (priorizar Google)
    const merged = new Map<string, Appointment>();

    // Primero citas locales
    for (const local of dbAppointments) {
      const key = local.google_event_id || `local-${local.id}`;
      merged.set(key, local);
    }

    // Luego citas de Google (reemplazan si ya hay una local con ese google_event_id)
    for (const gEvent of googleEvents) {
      const key = gEvent.google_event_id || `google-${gEvent.google_event_id}`;

      // Si ya existe una cita local con ese evento, NO la reemplazamos
      if (!merged.has(key)) {
        merged.set(key, gEvent);
      }
    }

    // Convertimos a array final
    const mergedAppointments = Array.from(merged.values());

    return successResponse(res, mergedAppointments, "Appointments fetched successfully");
  } catch (error: any) {
    console.error("Error en listAppointments:", error);
    return errorResponse(res, "Error al obtener citas", 500);
  }
};



/**
 * Obtener una cita específica por ID
 * @param req - Solicitud HTTP
 * @param res - Respuesta HTTP
 * @return {Response} - Respuesta con la cita o un mensaje de error
 */
export const getAppointment = async (req: Request, res: Response) => {

  const { authorUid } = req;
  const { id } = req.params;
  try {
    // Verifica si la cita existe y pertenece al usuario autenticado
    const appointment = await Appointment.findOne({
      where: {
        id: id,
        user_id: authorUid,
      }
    });

    // Si la cita no existe, devuelve un error 404
    // Si la cita existe, devuelve los datos de la cita
    if (appointment) {
      return successResponse(res, appointment, 'Appointment found');
    } else {
      return errorResponse(res, 'Appointment not found', 404);
    }
  } catch (error) {
    console.error('Error in getAppointment:', error);
    return errorResponse(res, 'An error occurred while fetching the appointment', 500, error);
  }
};

/**
 * Crea una nueva cita
 * @param req - Solicitud HTTP 
 * @param res - Respuesta HTTP
 * @return {Response} - Respuesta con la cita creada o un mensaje de error
 */
export const createAppointment = async (req: Request, res: Response) => {
  const patientId = req.body.patient_id;
  const { authorUid } = req;
  const { body } = req;

  try {
    const appointment = new Appointment(body);
    appointment.user_id = authorUid || 0;
    appointment.patient_id = parseInt(patientId);

    console.log("Creating appointment | uid:", appointment.user_id);
    console.log("patient_id:" + appointment.patient_id);
    console.log("appointment:" + appointment.dataValues);
    const newAppointment = await Appointment.create(appointment.dataValues);
    console.log ("New appointment created:", newAppointment.dataValues);
    // Intentar sincronizar con Google Calendar
    const oauth2Client = await getValidGoogleClient (authorUid!);
    if (oauth2Client) {
      try {
        //como mejora añadir nombre de paciente
        const googleEventId = await createGoogleCalendarEvent(oauth2Client, newAppointment);
        // Actualizar el ID del evento de Google Calendar en la cita
        await newAppointment.update({ google_event_id: googleEventId });
        console.log('Evento creado en Google Calendar:', googleEventId);
      } catch (err) {
        console.warn('Error al crear evento en Google Calendar:', (err as Error).message);
      }
    }

    return successResponse(res, newAppointment, 'Appointment created successfully');
  } catch (error) {
    console.error('Error in createAppointment:', error);
    return errorResponse(res, 'An error occurred while creating the appointment', 500, error);
  }
};

/**
 * Actualizar una cita existente
 * @param req - Solicitud HTTP
 * @param res - Respuesta HTTP
 * @return {Response} - Respuesta con la cita actualizada o un mensaje de error
 */
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

    // Respuesta estandarizada
    return successResponse(res, appointment, 'Appointment updated successfully');

  } catch (error) {
    res.status(500).json({
      msg: "Ocurrió un problema al realizar tu solicitud",
      error
    });
  }
};

/**
 * Eliminar una cita existente
 * @param req - Solicitud HTTP
 * @param res - Respuesta HTTP
 * @return {Response} - Respuesta con un mensaje de éxito o un mensaje de error
 */
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

    // Respuesta estandarizada
    return successResponse(res, {}, 'Appointment deleted successfully');
  } catch (error) {
    console.error('Error in deleteAppointment:', error);
    return errorResponse(res, 'An error occurred while deleting the appointment', 500, error);
  }
};
