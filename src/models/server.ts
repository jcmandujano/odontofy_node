//inyeccion de dependencias
import express, { Application } from "express";
import userRoutes from '../routes/user.route'
import authRoutes from '../routes/auth.route';
import patientRoutes from '../routes/patient.route';
import noteRoutes from '../routes/evolution-note.route';
import paymentRoutes from '../routes/payment.route';
import conceptRoutes from '../routes/concept.route';
import userConceptRoutes from '../routes/user-concept.route';
import informedConsentsRoutes from '../routes/informed-consent.route';
import userInformedConsentRoutes from '../routes/user-informed-consent.route'
import signedConsentsRoutes from '../routes/signed-consents.route';
import appointmentRoutes from '../routes/appointment.route';
import calendarRoutes from '../routes/google.route';

import cors from 'cors'
import db from "../db/connection";

class Server {

    private app: Application;
    private port: string;
    private apiRoutes = {
        auth: '/api/auth',
        users: '/api/users',
        patients: '/api/patients',
        evolutionNotes: '/api/patients',
        payments: '/api/patients',
        concepts: '/api/concepts',
        userConcepts: '/api/user-concepts',
        informedConsents: '/api/informed-consents', 
        signedConsentsRoutes: '/api/signed-consents',
        appointmentRoutes: '/api/appointments',
        userInformedConsentRoutes: '/api/user-informed-consents',
        calendarRoutes: '/api/google',

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
        this.app.use(this.apiRoutes.payments, paymentRoutes)
        this.app.use(this.apiRoutes.concepts, conceptRoutes)
        this.app.use(this.apiRoutes.userConcepts, userConceptRoutes)
        this.app.use(this.apiRoutes.informedConsents, informedConsentsRoutes)
        this.app.use(this.apiRoutes.signedConsentsRoutes, signedConsentsRoutes)
        this.app.use(this.apiRoutes.appointmentRoutes, appointmentRoutes)
        this.app.use(this.apiRoutes.userInformedConsentRoutes, userInformedConsentRoutes)
        this.app.use(this.apiRoutes.calendarRoutes, calendarRoutes)
    }

    //middlewares que se ejecutan antes de la ruta
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