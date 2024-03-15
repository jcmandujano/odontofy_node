import  jwt  from "jsonwebtoken";

export const generarJWT = (uid: number) => {
    return new Promise((resolve, reject) => {
        const payload = { uid };

        jwt.sign(payload, process.env.SECRETORPRIVATEKEY!, {
            expiresIn: '1d'
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