import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface UserAttributes {
    id: number;
    name: string;
    middle_name: string;
    last_name: string;
    date_of_birth: Date;
    phone: string;
    avatar: string;
    email: string | null;
    password: string;
    status: boolean;
    show_finance_stats?: boolean;
    google_access_token?: string | null;
    google_refresh_token?: string | null;
    google_token_expiry_date?: Date | null;
}

type UserCreationAttributes = Optional<UserAttributes, "id">;

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
    show_finance_stats!: boolean;
    google_access_token!: string | null;
    google_refresh_token!: string | null;
    google_token_expiry_date!: Date | null;

    toSafeJSON() {
        const data: Partial<UserAttributes> = { ...this.toJSON() };
        delete data.password;
        delete data.google_access_token;
        delete data.google_refresh_token;
        delete data.google_token_expiry_date;
        return {
            ...data,
            is_google_synced: Boolean(this.google_refresh_token),
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
    date_of_birth: DataTypes.DATE,
    phone: DataTypes.STRING,
    avatar: DataTypes.STRING,
    email: DataTypes.STRING,
    password: {
        type: DataTypes.STRING,
        field: 'password_hash'
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    show_finance_stats: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    google_access_token: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    google_refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    google_token_expiry_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'google_token_expiry_at'
    }
}, {
    sequelize: db,
    tableName: "users",
    underscored: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
});

export default User;
