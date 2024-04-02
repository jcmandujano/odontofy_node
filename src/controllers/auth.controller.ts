import { Request, Response } from "express";
//import { randomBytes }  from "node:crypto";
import  bcryptjs from "bcryptjs";
import User from "../models/user.model";
import { generarJWT } from "../helpers/generar-jwt";
//import Token from "../models/token.model";
//import { sendEmail } from "./mailing.controller";

export const doLogin = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {

        //verify if email exist
        const user = await User.findOne({
            where: {
                email: username
            }
        });

        if(!user){
            return res.status(400).json({
                msg: "Usuario o contraseña no son correctos"
            })
        }

        //if user is active
        if(!user.status){
            return res.status(400).json({
                msg: "El usuario con el que intentas acceder no existe"
            })
        }

        //verify password
        const validPassword = bcryptjs.compareSync(password, user.password)

        if(!validPassword){
            return res.status(400).json({
                msg: "Usuario o contraseña no son correctos"
            })
        }

        //generate JWT
        const token = await generarJWT(user.id);
     
        res.json({
            msg: 'LOGIN OK',
            user,
            token
        })
        
    } catch (error) {
        return res.status(500).json({
            msg: "No se pudo realizar tu solicitud"
        })
    }
}

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
    const status = true;
    const newUser = User.build({ 
        name,
        middle_name,
        last_name,
        date_of_birth,
        phone,
        avatar,
        email,
        password,
        status
     })
    try {

        //validamos si el usuario que quieres registrar ya existe
        const existEmail = await User.findOne({
            where: {
                email: email
            }
        })

        if(existEmail){
            return res.status(400).json({
                msg: 'El email que deseas registrar ya existe'
            })
        }
        
        //encriptar contraseña
        const salt = bcryptjs.genSaltSync();
        newUser.password = bcryptjs.hashSync(newUser.password, salt)
        await newUser.save();

        //si el usuario se crea correctamente, generamos el token para validar
        //la cuenta via email
        //vamos a prender esto cuando exista un servidor SMTP configurado
        /* if(newUser){
            //vamos a prender esto cuando exista un servidor SMTP configurado
            let setToken = await Token.create({
                userId: newUser.id,
                token: randomBytes(16).toString()
            })

            //if token is created, send the user a mail
            if(setToken){
                //send email to the user
                //with the function coming from the mailing.js file
                //message containing the user id and the token to help verify their email
                sendEmail(
                    "no-reply@example.com",
                    `carlosmandujano.v@gmail.com`,
                    "Account Verification Link",
                    `Hello, ${newUser.nombre} Please verify your email by
                            clicking this link :
                            http://localhost:8080/api/users/verify-email/${newUser.id}/${setToken.token} `,
                )
                console.log('SE ENVIO EL EMAIL')
            } else {
                return res.status(400).send("token not created");
            }
        } 
        */
        res.json({
            msg: 'Usuario registrado correctamente',
            user: newUser
        })
        
    } catch (error) {
        res.status(500).json({
            msg: 'Ocurrio un problema al realizar tu solicitud',
            error
        })
    }
}