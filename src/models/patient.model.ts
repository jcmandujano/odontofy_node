import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface PatientAttributes {
    id: number
    user_id: number
    name: string
    middle_name: string | null
    last_name: string
    gender: string | null
    date_of_birth: Date | null
    phone: string | null
    marital_status: string | null
    occupation: string | null
    address: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    emergency_contact_relationship: string | null
    reason_for_consultation: string | null
    rfc: string | null
    family_medical_history: Record<string, unknown> | null
    personal_medical_history: Record<string, unknown> | null
    email: string | null
    status: boolean
    debt: string | number
    createdAt?: Date
    updatedAt?: Date
}

type PatientCreationAttributes = Optional<PatientAttributes, "id">;

class Patient extends Model<PatientAttributes, PatientCreationAttributes> implements PatientAttributes {
    id!: number;
    user_id!: number;
    name!: string
    middle_name!: string | null
    last_name!: string
    gender!: string | null
    date_of_birth!: Date | null
    phone!: string | null
    marital_status!: string | null
    occupation!: string | null
    address!: string | null
    emergency_contact_name!: string | null
    emergency_contact_phone!: string | null
    emergency_contact_relationship!: string | null
    reason_for_consultation!: string | null
    rfc!: string | null
    family_medical_history!: Record<string, unknown> | null
    personal_medical_history!: Record<string, unknown> | null
    email!: string | null
    status!: boolean
    debt!: string | number
    createdAt!: Date
    updatedAt!: Date
}

Patient.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    middle_name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    last_name: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    gender: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    marital_status: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    occupation: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    emergency_contact_name: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    emergency_contact_phone: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    emergency_contact_relationship: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    reason_for_consultation: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    rfc: {
        type: DataTypes.STRING(13),
        allowNull: true
    },
    family_medical_history: {
        type: DataTypes.JSON,
        allowNull: true
    },
    personal_medical_history: {
        type: DataTypes.JSON,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(254),
        allowNull: true
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    debt: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'current_balance'
    }
},{
    sequelize: db,
    tableName: "patients",
    underscored: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  });

export default Patient;
