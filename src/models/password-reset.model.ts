import { DataTypes, Model } from "sequelize";
import db from "../db/connection";
import User from "./user.model";

class PasswordReset extends Model {
    public id!: number;
    public user_id!: number;
    public token!: string;
    public expires_at!: Date;
    public used!: boolean;
}

PasswordReset.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        token: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'expires_at',
        },
        used: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        sequelize: db,
        tableName: "password_resets",
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        timestamps: true,
    }
);

PasswordReset.belongsTo(User, { foreignKey: "user_id" });

export default PasswordReset;
