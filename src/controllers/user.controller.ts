import { Request, Response } from "express"
import User from "../models/user.model"
import { errorResponse, successResponse } from "../utils/response";
import { PaginatedResponse } from "../types/api-response";

/**
 * Retrieves a paginated list of users (patients) associated with the authenticated user.
 *
 * @param req - Express HTTP request object, expects optional `page` and `limit` query parameters for pagination.
 * @param res - Express HTTP response object.
 * @returns Returns a paginated response containing a list of users without sensitive data, or an error message if the operation fails.
 *
 * @remarks
 * - The response includes pagination metadata: total count, current page, items per page, total pages, and the results array.
 * - Sensitive user data is omitted using the `toSafeJSON` method.
 * - Handles errors gracefully and logs them to the console.
 */
export const getUsers = async (req: Request, res: Response) => {

    try {
        // Configuración de paginación: página actual y límite de resultados
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        // Obtiene los usuarios con paginación
        const { count, rows: users } = await User.findAndCountAll({
            limit,
            offset
        });

        //construimos un objeto de usuarios sin datos sensibles
        const safeUsers = users.map(user => user.toSafeJSON());

        // Respuesta paginada
        const response: PaginatedResponse<typeof safeUsers[number]> = {
            total: count,
            page,
            perPage: limit,
            totalPages: Math.ceil(count / limit),
            results: safeUsers
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
 * Retrieves a user by their ID from the database.
 *
 * @param req - Express request object containing the user ID in the route parameters.
 * @param res - Express response object used to send the response.
 * @returns A JSON response with the user data if found, or an error message if not found or if an error occurs.
 *
 * @remarks
 * - Returns a 200 status code and the user data if the user is found.
 * - Returns a 404 status code if the user is not found.
 * - Returns a 500 status code if an internal server error occurs.
 */
export const getUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await User.findByPk(id);

        if (user) {
            return successResponse(res, user.toSafeJSON(), 'User found');
        } else {
            return errorResponse(res, 'User not found', 404);
        }
    } catch (error) {
        console.error('Error in getUser:', error);
        return errorResponse(res, 'An error occurred while fetching the patient', 500, error);
    }

};

/**
 * Creates a new user in the system.
 *
 * This controller function handles the creation of a new user by validating the uniqueness
 * of the provided email address. If the email already exists, it returns an error response.
 * Otherwise, it creates the user and returns a success response with the user's safe JSON representation.
 *
 * @param req - Express request object containing the user data in the body.
 * @param res - Express response object used to send the response.
 * @returns A JSON response indicating success or failure of the user creation process.
 *
 * @throws 400 - If the email already exists in the database.
 * @throws 500 - If an unexpected error occurs during user creation.
 */
export const createUser = async (req: Request, res: Response) => {
    const { body } = req;

    try {
        const existEmail = await User.findOne({
            where: {
                email: body.email
            }
        })

        if (existEmail) {
            return errorResponse(res, 'Email already exist', 400);
        }

        const newUser = await User.create(body);
        return successResponse(res, newUser.toSafeJSON(), 'User created successfully');
    } catch (error) {
        console.error('Error in createUser:', error);
        return errorResponse(res, 'An error occurred while creating the patient', 500, error);
    }
}


/**
 * Updates an existing user by their ID.
 *
 * This controller function receives a user ID from the request parameters and the updated user data from the request body.
 * It checks if the user exists, verifies that the new email (if provided) is not already in use by another user,
 * updates the user record, and returns a success response with the updated user data.
 *
 * @param req - Express request object containing the user ID in `params` and updated data in `body`.
 * @param res - Express response object used to send the response.
 * @returns A JSON response indicating the result of the update operation.
 *
 * @throws 404 if the user does not exist.
 * @throws 400 if the new email is already in use by another user.
 * @throws 500 if an unexpected error occurs during the update process.
 */
export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { body } = req;
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return errorResponse(res, 'User with this id no exist ' + id, 404);
        }

        if (body.email) {
            const existEmail = await User.findOne({
                where: {
                    email: body.email
                }
            });

            if (existEmail) {
                return errorResponse(res, 'Email already exist', 400);
            }
        }

        await user.update(body);

        return successResponse(res, user.toSafeJSON(), 'User updated successfully');

    } catch (error) {
        console.error('Error in updateUser:', error);
        return errorResponse(res, 'An error occurred while updating the user', 500, error);
    }
}

/**
 * Deletes a user by setting their status to false.
 *
 * @param req - Express request object containing the user ID in the route parameters.
 * @param res - Express response object used to send the response.
 * @returns A JSON response indicating success or failure of the deletion operation.
 *
 * @remarks
 * - If the user with the specified ID does not exist, responds with a 404 error.
 * - On successful deletion, responds with the updated user data and a success message.
 * - Handles and logs any errors that occur during the process, responding with a 500 error if needed.
 */
export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return errorResponse(res, 'User with this id no exist ' + id, 404);
        }

        await user.update({ status: false });

        return successResponse(res, user.toSafeJSON(), 'User deleted successfully');

    } catch (error) {
        console.error('Error in deleteUser:', error);
        return errorResponse(res, 'An error occurred while deleting the user', 500, error);
    }

}