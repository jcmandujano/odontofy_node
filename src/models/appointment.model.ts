import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

// Definir los atributos del modelo
interface AppointmentAttributes {
    id: number;
    user_id: number;
    patient_id: number;
    appointment_date: Date;
    appointment_time: string;
    status: string;
    note: string | null; // Nueva propiedad para contenido HTML
}

// Definir los atributos opcionales al crear una nueva instancia (id es opcional porque es auto-incremental)
interface AppointmentCreationAttributes extends Optional<AppointmentAttributes, "id"> {}

// Definir la clase del modelo
class Appointment extends Model<AppointmentAttributes, AppointmentCreationAttributes> implements AppointmentAttributes {
    public id!: number;
    public user_id!: number;
    public patient_id!: number;
    public appointment_date!: Date;
    public appointment_time!: string;
    public status!: string;
    public note!: string | null; // Inicializar la propiedad "note"
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
    appointment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    appointment_time: {
        type: DataTypes.TIME,
        allowNull: false,
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
}, {
    sequelize: db,
    tableName: "appointments",
    timestamps: true, // Para crear automáticamente las columnas createdAt y updatedAt
    createdAt: "createdAt",
    updatedAt: "updatedAt",
});

export default Appointment;
