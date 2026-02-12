import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";
import Patient from "./patient.model";

// Definir los atributos del modelo
interface AppointmentAttributes {
id: number;
    user_id: number;
    patient_id: number | null; // null si viene de Google
    appointment_datetime: Date | null; // null si viene de Google
    appointment_end_datetime: Date | null;
    status: string;
    reason: string | null;
    note: string | null;
    google_event_id: string | null;
    source: 'local' | 'google';
}

// Definir los atributos opcionales al crear una nueva instancia (id es opcional porque es auto-incremental)
type AppointmentCreationAttributes = Optional<AppointmentAttributes, "id">

// Definir la clase del modelo
class Appointment extends Model<AppointmentAttributes, AppointmentCreationAttributes> implements AppointmentAttributes {
    public id!: number;
    public user_id!: number;
    public patient_id!: number;
    public appointment_datetime!: Date;
    public appointment_end_datetime!: Date | null;
    public status!: string;
    public reason!: string | null;
    public note!: string | null; // Inicializar la propiedad "note"
    public google_event_id!: string | null; // Inicializar la propiedad "google_event_id"
    public source!: 'local' | 'google';
    public Patient? : Patient;

}

// Inicializar el modelo
Appointment.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    appointment_datetime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: "Fecha y hora de la cita en UTC",
    },
    appointment_end_datetime: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    note: {
        type: DataTypes.TEXT, // Usamos TEXT para almacenar el contenido HTML
        allowNull: true, // Permitir valores nulos para cuando no haya una nota
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pendiente',
    },
    google_event_id: {
        type: DataTypes.STRING,
        allowNull: true, // Permitir valores nulos para cuando no haya un evento de Google Calendar
    },
  source: {
    type: DataTypes.ENUM('local', 'google'),
    allowNull: false,
    defaultValue: 'local',
  }
}, {
    sequelize: db,
    tableName: "appointments",
    timestamps: true, // Para crear automáticamente las columnas createdAt y updatedAt
    createdAt: "createdAt",
    updatedAt: "updatedAt",
});

// Después de la clase Patient o al final del archivo
Patient.hasMany(Appointment, { foreignKey: 'patient_id' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id' });

export default Appointment;
