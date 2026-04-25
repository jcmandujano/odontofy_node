import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface TokenAttributes {
    id: number
    userId: number
    token: string
    expiresAt: Date
    used: boolean
}

interface TokenCreationAttributes extends Optional<TokenAttributes, "id"> {}

class Token extends Model<TokenAttributes, TokenCreationAttributes> implements TokenAttributes{
    id!: number;
    userId!: number;
    token!: string;
    expiresAt!: Date;
    used!: boolean;
}

Token.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER
    },
    t,
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    },
    used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }oken: {
        type: DataTypes.STRING
    }
},{
    sequelize: db,
    tableName: "tokens",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
}
)

export default Token