import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface UserAttributes {
    id: number;
    name: string;
    middle_name: string;
    last_name: string;
    date_of_birth: Date | null;
    phone: string;
    avatar: string;
    email: string;
    password: string;
    status: boolean;
    auth_version?: number;
    show_finance_stats?: boolean;
}

type UserCreationAttributes = Optional<UserAttributes, "id">;

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id!: number;
    name!: string;
    middle_name!: string;
    last_name!: string;
    date_of_birth!: Date | null;
    phone!: string;
    avatar!: string;
    email!: string;
    password!: string;
    status!: boolean;
    auth_version!: number;
    show_finance_stats!: boolean;
    toSafeJSON(isGoogleSynced = false) {
        const data: Partial<UserAttributes> = { ...this.toJSON() };
        delete data.password;
        return {
            ...data,
            is_google_synced: isGoogleSynced,
        };
    }
}

User.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    name: DataTypes.STRING,
    middle_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true
    },
    phone: DataTypes.STRING,
    avatar: DataTypes.STRING,
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        field: 'password_hash'
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    auth_version: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
    },
    show_finance_stats: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
}, {
    sequelize: db,
    tableName: "users",
    underscored: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
});

export default User;
