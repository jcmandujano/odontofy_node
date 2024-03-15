import  jwt  from "jsonwebtoken";
import { Request, Response } from "express"
import User from "../models/user.model";

// Extender la interfaz Request de Express para incluir la propiedad authorUid
declare global {
    namespace Express {
        interface Request {
            authorUid?: number;
        }
    }
}

export const validarJWT = async (req: Request, res:  Response, next: any) => {

    const token = req.header('Authorization');

    if(!token){
        return res.status(401).json({
            msg: "Token no valido"
        })
    }

    try {
        const TokenArray = token.split(" ");
        //validar que el usuario exista en base de datos
        const decoded = jwt.verify(TokenArray[1], process.env.SECRETORPRIVATEKEY!) as { uid: number }; 
        const user = await User.findByPk(decoded.uid);
        if(user && user.status){
            req.authorUid = decoded.uid
            next();
        }else {
          res.status(401).json({
                msg: 'No autorizado. Token inválido o no proporcionado.'
            });
        }

    } catch (error) {
        return res.status(401).json({
            msg: "Token no valido",
            error
        })
    }

}