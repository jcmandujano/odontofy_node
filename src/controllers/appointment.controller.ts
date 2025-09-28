/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import Appointment from "../models/appointment.model";
import { Op } from "sequelize";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, getAuthorizedGoogleClient, listGoogleCalendarEvents, updateGoogleCalendarEvent } from "../utils/googleCalendar";
import { errorResponse, successResponse } from "../utils/response";
import Patient from "../models/patient.model";


/**
 * Obtener una lista paginada de citas asociadas al usuario autenticado
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con la lista de citas o un mensaje de error
 */
/* export const _listAppointments = async (req: Request, res: Response) => {
  try {
    const { authorUid } = req;
    const { startDate, endDate } = req.query;

    // Configuración de paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Convertir startDate y endDate a string si son arrays o ParsedQs
    const start = Array.isArray(startDate) ? startDate[0] : (typeof startDate === 'object' ? '' : startDate);
    const end = Array.isArray(endDate) ? endDate[0] : (typeof endDate === 'object' ? '' : endDate);

    // Construcción de condiciones de búsqueda
    const whereCondition: Record<string, unknown> = {
      user_id: authorUid,
      appointment_date: {
        [Op.between]: [start as string, end as string],
      },
    };

    // Búsqueda con conteo total para paginación
    const { count, rows: dbAppointments } = await Appointment.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [["appointment_date", "ASC"], ["appointment_time", "ASC"]],
    });

    // Intentar obtener eventos de Google Calendar
    let googleEvents: unknown[] = [];
    const oauth2Client = await getAuthorizedGoogleClient(authorUid!);
    console.log('OAuth2 Client:', oauth2Client ? 'Available' : 'Not available');
    if (oauth2Client) {
      try {
        googleEvents = await listGoogleCalendarEvents(oauth2Client, 30);
        console.log(`Fetched ${googleEvents.length} events from Google Calendar`);
      } catch (err) {
        console.warn('No se pudieron obtener eventos de Google Calendar:', err);
      }
    }

    // Respuesta estandarizada
    const response: PaginatedResponse<typeof dbAppointments[number]> = {
      total: count,
      page,
      perPage: limit,
      totalPages: Math.ceil(count / limit),
      results: dbAppointments
    };

    return successResponse(res, { ...response, googleEvents }, 'Appointments fetched successfully');
  } catch (error) {
    console.error('Error in listAppointments:', error);
    return errorResponse(res, 'Failed to fetch appointments', 500, error);
  }
}; */



export const listAppointments = async (req: Request, res: Response) => {
  try {
    const { authorUid } = req;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return errorResponse(res, "Debes enviar startDate y endDate en la consulta", 400);
    }

    // Convertir startDate y endDate a string si son arrays o ParsedQs
    const start = Array.isArray(startDate) ? startDate[0] : (typeof startDate === 'object' ? '' : startDate);
    const end = Array.isArray(endDate) ? endDate[0] : (typeof endDate === 'object' ? '' : endDate);


    // 1. Obtener citas locales de la DB dentro del rango
    const dbAppointments = await Appointment.findAll({
      where: {
        user_id: authorUid,
        appointment_date: {
          [Op.between]: [start as string, end as string],
        },
      },
      include: [{ model: Patient, attributes: ["id", "name"] }],
    });

    const localEvents = dbAppointments.map((a: any) => ({
      id: a.id.toString(),
      source: "local",
      title:
        a.patient_id === 0
          ? "Cita sin paciente asignado"
          : `Cita con paciente: ${a.Patient?.name || a.patient_id}`,
      start: new Date(`${a.appointment_date}T${a.appointment_time}`),
      end: new Date(`${a.appointment_date}T${a.appointment_time}`),
      note: a.note,
      status: a.status,
      google_event_id: a.google_event_id,
    }));

    // 2. Obtener eventos de Google Calendar en el mismo rango
    // Intentar obtener eventos de Google Calendar
    let googleEvents: unknown[] = [];
    const oauth2Client = await getAuthorizedGoogleClient(authorUid!);
    console.log('OAuth2 Client:', oauth2Client ? 'Available' : 'Not available');
    if (oauth2Client) {
      try {
        googleEvents = await listGoogleCalendarEvents(oauth2Client, new Date(startDate as string).toISOString(), new Date(endDate as string).toISOString());
        console.log(`Fetched ${googleEvents.length} events from Google Calendar`);
      } catch (err) {
        console.warn('No se pudieron obtener eventos de Google Calendar:', err);
      }
    }

    let googleMapped = googleEvents.map((ev) => {
      const event = ev as {
        id?: string;
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        description?: string;
        status?: string;
      };
      return {
        id: event.id!,
        source: "google",
        title: event.summary || "Evento de Google",
        start: event.start?.dateTime
          ? new Date(event.start.dateTime)
          : new Date(event.start?.date || ""),
        end: event.end?.dateTime
          ? new Date(event.end.dateTime)
          : new Date(event.end?.date || ""),
        note: event.description || null,
        status: event.status,
        google_event_id: event.id,
      };
    });

    // 3. Filtrar duplicados → si ya existe en DB (google_event_id), no lo mostramos de Google
    const dbGoogleIds = new Set(
      localEvents.map((ev) => ev.google_event_id).filter((id) => !!id)
    );
    googleMapped = googleMapped.filter((ev) => !dbGoogleIds.has(ev.id));

    // 4. Unificar
    const unifiedEvents = [...localEvents, ...googleMapped];

    return successResponse(res, unifiedEvents, "Appointments fetched successfully");
  } catch (error) {
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

    const newAppointment = await Appointment.create(appointment.dataValues);

    // Intentar sincronizar con Google Calendar
    const oauth2Client = await getAuthorizedGoogleClient(authorUid!);
    if (oauth2Client) {
      try {
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
