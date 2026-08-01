import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

export const generarJWT = (uid: number) => {
    return new Promise((resolve, reject) => {
        const payload = { uid, jti: randomUUID() };

        jwt.sign(payload, process.env.SECRETORPRIVATEKEY!, {
            expiresIn: '10m',
            algorithm: 'HS256',
            issuer: process.env.JWT_ISSUER || 'odontofy-api',
            audience: process.env.JWT_AUDIENCE || 'odontofy-web',
            subject: String(uid)
        }, (err, token) => {
            if(err){
                console.log('Error on generate token', err);
                reject( 'No se pudo generar el token' )
            }else{
                resolve(token)
            }
        })

    })
}
