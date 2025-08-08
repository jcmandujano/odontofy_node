import { Request, Response } from "express"
import Patient from "../models/patient.model"
import { Op } from "sequelize";
import Appointment from "../models/appointment.model";
import { errorResponse, successResponse } from "../utils/response";
import { PaginatedResponse } from "../types/api-response";

/**
 * Get a paginated list of patients associated with the authenticated user
 * @param {Request} req - The HTTP request
 * @param {Response} res - The HTTP response
 * @returns {Response} Response with the list of patients or an error message
 */
export const listPatient = async (req: Request, res: Response) => {
    try {
        // Obtiene el identificador del usuario autenticado desde el JWT
        const { authorUid } = req;

        // Configuración de paginación: página actual y límite de resultados
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        console.log(`Fetching users: page=${page}, limit=${limit}, offset=${offset}`);
        // Obtiene los pacientes asociados al usuario autenticado con citas futuras
        const { count, rows: patients } = await Patient.findAndCountAll({
            where: {
                user_id: authorUid
            },
            include: [
                {
                    model: Appointment,
                    where: {
                        appointment_date: {
                            [Op.gte]: new Date() // solo citas futuras
                        }
                    },
                    required: false,
                    limit: 1,
                    order: [['appointment_date', 'ASC']],
                    attributes: ['appointment_date', 'appointment_time', 'status']
                }
            ],
            limit,
            offset,
            distinct: true // para contar correctamente con joins
        });

        // Respuesta paginada
        const response: PaginatedResponse<typeof patients[number]> = {
            total: count,
            page,
            perPage: limit,
            totalPages: Math.ceil(count / limit),
            results: patients
        };

        // Devuelve la respuesta exitosa con los datos
        return successResponse(res, response, 'Patients fetched successfully');
    } catch (err) {
        // Manejo de errores
        console.error('Error in listPatient:', err);
        return errorResponse(res, 'Failed to fetch patients', 500, err);
    }
};

/**
 * Obtener un paciente específico por su ID
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con el paciente o un mensaje de error
 */
export const getPatient = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;

    try {
        // Verifica si el ID del paciente es un número válido
        const patient = await Patient.findOne({
            where: {
                id,
                user_id: authorUid
            }
        });

        // Si el paciente no existe, devuelve un error 404
        // Si el paciente existe, devuelve los datos del paciente
        if (patient) {
            return successResponse(res, patient, 'Patient found');
        } else {
            return errorResponse(res, 'Patient not found', 404);
        }
    } catch (error) {
        console.error('Error in getPatient:', error);
        return errorResponse(res, 'An error occurred while fetching the patient', 500, error);
    }
}

/**
 * Crear un nuevo paciente
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con el paciente creado o un mensaje de error
 */
export const createPatient = async (req: Request, res: Response) => {
    const { body, authorUid } = req;

    try {
        // Verifica si el paciente ya existe
        const patient = new Patient({
            ...body,
            user_id: authorUid ?? 0,
            status: true
        });

        //Crea el paciente en la base de datos
        const newPatient = await Patient.create(patient.dataValues);
        return successResponse(res, newPatient, 'Patient created successfully');
    } catch (error) {
        console.error('Error in createPatient:', error);
        return errorResponse(res, 'An error occurred while creating the patient', 500, error);
    }
};

/**
 * Actualizar un paciente existente
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con el paciente actualizado o un mensaje de error
 */
export const updatePatient = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { body, authorUid } = req;

    try {
        // Verifica si el paciente existe
        const patient = await Patient.findOne({
            where: {
                id: id,
                user_id: authorUid
            }
        });

        // Si el paciente no existe, devuelve un error 404
        if (!patient) {
            return errorResponse(res, `No patient found with ID ${id}`, 404);
        }

        // Actualiza el paciente en la base de datos
        await patient.update(body);
        return successResponse(res, patient, 'Patient updated successfully');

    } catch (error) {
        console.error('Error in updatePatient:', error);
        return errorResponse(res, 'An error occurred while updating the patient', 500, error);
    }
}

/**
 * Eliminar un paciente existente
 * @param {Request} req - La solicitud HTTP
 * @param {Response} res - La respuesta HTTP
 * @returns {Response} Respuesta con un mensaje de éxito o un mensaje de error
 */
export const deletePatient = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { authorUid } = req;

    try {
        // Verifica si el paciente existe
        const patient = await Patient.findOne({
            where: {
                id,
                user_id: authorUid
            }
        });

        // Si el paciente no existe, devuelve un error 404
        if (!patient) {
            return errorResponse(res, `No patient found with ID ${id}`, 404);
        }

        // Elimina el paciente de la base de datos
        await patient.destroy();
        return successResponse(res, null, 'Patient deleted successfully');
    } catch (error) {
        console.error('Error in deletePatient:', error);
        return errorResponse(res, 'An error occurred while deleting the patient', 500, error);
    }
};
