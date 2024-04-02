import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface PatientAttributes {
    id: number
    user_id: number
    name: string
    middle_name: string
    last_name: string
    gender: string
    date_of_birth: Date
    phone: string
    marital_status: string
    occupation: string
    address: string
    emergency_contact_name: string
    emergency_contact_phone: string
    emergency_contact_relationship: string
    reason_for_consultation: string
    rfc: string
    family_medical_history: {}
    personal_medical_history: {}
    email: string
    status: boolean
}

interface PatientCreationAttributes extends Optional<PatientAttributes, "id"> {}

class Patient extends Model<PatientAttributes, PatientCreationAttributes> implements PatientAttributes {
    id!: number;
    user_id!: number;
    name!: string
    middle_name!: string
    last_name!: string
    gender!: string
    date_of_birth!: Date
    phone!: string
    marital_status!: string
    occupation!: string
    address!: string
    emergency_contact_name!: string
    emergency_contact_phone!: string
    emergency_contact_relationship!: string
    reason_for_consultation!: string
    rfc!: string
    family_medical_history!: {}
    personal_medical_history!: {}
    email!: string
    status!: boolean
}

Patient.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER
    },
    name: {
        type: DataTypes.STRING
    },
    middle_name: {
        type: DataTypes.STRING
    },
    last_name: {
        type: DataTypes.STRING
    },
    gender: {
        type: DataTypes.STRING
    },
    date_of_birth: {
        type: DataTypes.DATE
    },
    phone: {
        type: DataTypes.STRING
    },
    marital_status: {
        type: DataTypes.STRING
    },
    occupation: {
        type: DataTypes.STRING
    },
    address: {
        type: DataTypes.STRING
    },
    emergency_contact_name: {
        type: DataTypes.STRING
    },
    emergency_contact_phone: {
        type: DataTypes.STRING
    },
    emergency_contact_relationship: {
        type: DataTypes.STRING
    },
    reason_for_consultation: {
        type: DataTypes.STRING
    },
    rfc: {
        type: DataTypes.STRING
    },
    family_medical_history: {
        type: DataTypes.JSON
    },
    personal_medical_history: {
        type: DataTypes.JSON
    },
    email: {
        type: DataTypes.STRING
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
},{
    sequelize: db,
    tableName: "patients",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  });

export default Patient;