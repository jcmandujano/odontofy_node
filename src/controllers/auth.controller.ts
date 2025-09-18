import { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import bcryptjs from "bcryptjs";
import User from "../models/user.model";
import { generarJWT } from "../helpers/generar-jwt";
import { errorResponse, successResponse } from "../utils/response";
import Token from "../models/token.model";
import { sendEmail } from "../services/email.service";
import { accountConfirmationTemplate } from "../utils/email-templates/confirm-account.template";
import { accountActivatedTemplate } from "../utils/email-templates/activated-account.template";
import PasswordReset from "../models/password-reset.model";
import { resetPasswordTemplate } from "../utils/email-templates/reset-password.template";

/**
 * Handles user login by verifying credentials and generating a JWT token.
 *
 * @param req - Express request object containing `username` and `password` in the body.
 * @param res - Express response object used to send the result of the login attempt.
 * @returns A JSON response with a JWT token and user data if successful, or an error message otherwise.
 *
 * @remarks
 * - Checks if the user exists and is active.
 * - Validates the provided password.
 * - Responds with appropriate error messages for invalid credentials or inactive users.
 * - On success, returns a JWT token and sanitized user information.
 */
export const doLogin = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {

        //verify if email exist
        const user = await User.findOne({
            where: {
                email: username
            }
        });

        if (!user) {
            return errorResponse(res, 'Usuario o contraseña no son correctos', 400)
        }

        //if user is active
        if (!user.status) {
            return errorResponse(res, 'El usuario con el que intentas acceder no existe', 400)
        }

        //verify password
        const validPassword = bcryptjs.compareSync(password, user.password)

        if (!validPassword) {
            return errorResponse(res, 'Usuario o contraseña no son correctos', 400)
        }

        //generate JWT
        const token = await generarJWT(user.id);

        return successResponse(res, { user: user.toSafeJSON(), token }, "User logged in successfully")

    } catch (error) {
        console.error('Error in doLogin:', error);
        // Handle server error
        return errorResponse(res, 'Error del servidor', 500, error);
    }
}

/**
 * Registers a new user in the system.
 *
 * This controller function receives user registration data from the request body,
 * checks if the email is already registered, hashes the password, saves the new user,
 * and returns a success message along with the user data (excluding sensitive fields).
 * If the email already exists, it responds with a 400 error.
 * In case of server errors, it responds with a 500 error and the error details.
 *
 * @param req - Express request object containing user registration data in the body.
 * @param res - Express response object used to send the response.
 * @returns A JSON response with a success message and the registered user data,
 *          or an error message if registration fails.
 */
export const register = async (req: Request, res: Response) => {
    const {
        name,
        middle_name,
        last_name,
        date_of_birth,
        phone,
        avatar,
        email,
        password,
    } = req.body;

    const status = false; // Default status to false for new users until verified 

    try {
        // Validar si el correo ya existe
        const existEmail = await User.findOne({ where: { email } });

        if (existEmail) {
            return errorResponse(res, 'El email que deseas registrar ya existe', 400);
        }

        // Crear nuevo usuario
        const salt = bcryptjs.genSaltSync();
        const hashedPassword = bcryptjs.hashSync(password, salt);

        const newUser = await User.create({
            name,
            middle_name,
            last_name,
            date_of_birth,
            phone,
            avatar,
            email,
            password: hashedPassword,
            status,
        });

        // Crear token de verificación
        const token = randomBytes(16).toString('hex');
        await Token.create({
            userId: newUser.id,
            token,
        });

        // Generar enlace de confirmación
        const confirmationUrl = `${process.env.BACKEND_URL}/api/auth/verify-account/${newUser.id}/${token}`;

        // Enviar correo
        await sendEmail({
            to: 'carlosmandujano.v@gmail.com', //newUser.email || '', //testing with my email, uncomment this line to use the user's email
            subject: 'Confirma tu cuenta en Odontofy',
            html: accountConfirmationTemplate(newUser.name, confirmationUrl),
        });

        return successResponse(res, newUser.toSafeJSON(), 'Usuario registrado correctamente. Revisa tu correo para confirmar tu cuenta.');

    } catch (error) {
        console.error('Error en register:', error);
        return errorResponse(res, 'Ocurrió un problema al registrar el usuario', 500, error);
    }
};

/**
 * Verifies if the provided password matches the authenticated user's password.
 *
 * @param req - Express request object, expected to contain `authorUid` and `body.password`.
 * @param res - Express response object used to send the verification result.
 * @returns A JSON response indicating whether the password is valid or not.
 *
 * @remarks
 * - Returns 400 if the user is not found or the password is invalid.
 * - Returns 500 if a server error occurs.
 * - Assumes `User.findByPk` and `bcryptjs.compareSync` are available.
 */
export const verifyPassword = async (req: Request, res: Response) => {
    const { authorUid } = req;
    const { password } = req.body;

    try {
        const user = await User.findByPk(authorUid);

        if (!user) {
            return errorResponse(res, 'No existe un usuario con el id ' + authorUid, 400);
        }

        const isValid = bcryptjs.compareSync(password, user.password);
        if (!isValid) {
            return errorResponse(res, 'La contraseña no es correcta', 400);
        }

        return successResponse(res, '', 'Contraseña válida');
    } catch (error) {
        console.error('Error in verifyPassword:', error);
        return errorResponse(res, 'Error del servidor', 500, error);
    }
}

/**
 * Confirms a user's account using a verification token.
 *
 * This controller function handles account confirmation by verifying the provided
 * user ID and token from the request parameters. It checks if the user exists and
 * if the token is valid. If both checks pass, it updates the user's status to active,
 * deletes the token, and sends a confirmation email. It responds with appropriate
 * success or error messages based on the outcome of each step.
 * @param req - Express request object containing `userId` and `token` in the parameters.
 * @param res - Express response object used to send the response.
 * @returns A JSON response indicating the result of the account confirmation process.
 * @remarks
 * - Returns 404 if the user is not found.
 * - Returns 400 if the token is invalid.
 * - Returns 500 for server errors.
 * - Sends a confirmation email upon successful account activation.
 */

export const confirmAccount = async (req: Request, res: Response) => {
    const { userId, token } = req.params;

    try {
        // Find the user by ID
        const user = await User.findByPk(userId);
        if (!user) {
            return errorResponse(res, 'Usuario no encontrado', 404);
        }

        // Check if the token exists for the user
        const tokenRecord = await Token.findOne({ where: { userId: user.id, token } });
        if (!tokenRecord) {
            return errorResponse(res, 'Token de verificación no válido', 400);
        }

        // Update user's status to active
        user.status = true;
        await user.save();

        // Delete the token record after successful verification
        await Token.destroy({ where: { id: tokenRecord.id } });

        //return succes html message
        //send to frontend html template accountActivatedTemplate
        res.send(accountActivatedTemplate(user.name));

        //return successResponse(res, user.toSafeJSON(), 'Cuenta verificada exitosamente');
    } catch (error) {
        console.error('Error in confirmAccount:', error);
        return errorResponse(res, 'Error del servidor', 500, error);
    }
}

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        // Check if the user exists
        console.log('Arrived at forgotPassword with email:', email);
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return errorResponse(res, 'Ocurrio un problema con el email', 400);
        }

        // Create a password reset token
        const resetToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000); // Token expires in 1 hour

        const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password?uid=${user.id}&token=${resetToken}`;

        // Save the token and expiration date in the database
        await PasswordReset.create({
            user_id: user.id,
            token: resetToken,
            expires_at: expiresAt,
        });

        // Send the password reset email
        await sendEmail({
            to: 'carlosmandujano.v@gmail.com', //newUser.email || '', //testing with my email, uncomment this line to use the user's email
            subject: 'Confirma tu cuenta en Odontofy',
            html: resetPasswordTemplate(user.name, resetPasswordUrl),
        });

        return successResponse(res, 'Se ha enviado un correo electrónico para restablecer la contraseña');
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        return errorResponse(res, 'Error del servidor', 500, error);
    }
}

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ ok: false, msg: "Token y contraseña son requeridos" });
        }

        // Buscar token en la tabla
        const passwordReset = await PasswordReset.findOne({ where: { token } });

        if (!passwordReset) {
            return res.status(400).json({ ok: false, msg: "Token inválido" });
        }

        if (passwordReset.used) {
            return res.status(400).json({ ok: false, msg: "El token ya fue usado" });
        }

        if (passwordReset.expires_at < new Date()) {
            return res.status(400).json({ ok: false, msg: "El token ha expirado" });
        }

        // Buscar usuario
        const user = await User.findByPk(passwordReset.user_id);
        if (!user) {
            return res.status(400).json({ ok: false, msg: "Usuario no encontrado" });
        }

        // Hashear nueva contraseña
        const hashedPassword = await bcryptjs.hash(password, 10);

        // Guardar nueva contraseña
        user.password = hashedPassword;
        await user.save();

        // Marcar token como usado
        passwordReset.used = true;
        await passwordReset.save();

        return res.status(200).json({ ok: true, msg: "Contraseña actualizada correctamente" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, msg: "Error en el servidor" });
    }
};
