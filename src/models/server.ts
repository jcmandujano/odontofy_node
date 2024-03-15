//inyeccion de dependencias
import express, { Application } from "express";
import userRoutes from '../routes/user.route'
import authRoutes from '../routes/auth.route';
import patientRoutes from '../routes/patient.route';
import noteRoutes from '../routes/evolution-note.route';
import cors from 'cors'
import db from "../db/connection";

class Server {

    private app: Application;
    private port: string;
    private apiRoutes = {
        auth: '/api/auth',
        users: '/api/users',
        patients: '/api/patients',
        evolutionNotes: '/api/patients'
    }

    constructor(){
        this.app = express();
        this.port = process.env.PORT || '8000';

        //configuramos middlewares y rutas
        this.dbConfig();
        this.middlewares();
        this.routes();
    }

    routes() {
        this.app.use(this.apiRoutes.users, userRoutes)
        this.app.use(this.apiRoutes.auth, authRoutes)
        this.app.use(this.apiRoutes.patients, patientRoutes)
        this.app.use(this.apiRoutes.evolutionNotes, noteRoutes)
    }

    //pequeño codigo que se ejecuta antes de la ruta
    middlewares(){
        //cors
        this.app.use(cors())

        //lectura del body
        this.app.use(express.json())

        //carpeta publica
        this.app.use(express.static('public'))
    }

    async dbConfig(){
        try {
            await db.authenticate();
        } catch (error: any) {
            console.log('OCURRIO UN ERROR')
            throw new Error(error)
        }
    }

    listen(){
        this.app.listen(this.port, () => {
            console.log('Servidor corriendo en ' + this.port)
        })
    }
}

export default Server