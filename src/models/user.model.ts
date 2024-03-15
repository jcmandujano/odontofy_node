import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface UserAttributes {
    id: number
    name: string
    middle_name: string
    last_name: string
    date_of_birth: Date
    phone: string
    avatar: string
    email: string | null
    password: string
    status: boolean
}

interface UserCreationAttributes extends Optional<UserAttributes, "id"> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id!: number;
    name!: string;
    middle_name!: string;
    last_name!: string;
    date_of_birth!: Date;
    phone!: string;
    avatar!: string;
    email!: string | null;
    password!: string;
    status!: boolean;
}

User.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
    date_of_birth: {
        type: DataTypes.DATE
    },
    phone: {
        type: DataTypes.STRING
    },
    avatar: {
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING
    },
    password: {
        type: DataTypes.STRING
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
},{
    sequelize: db,
    tableName: "users",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  });

export default User;