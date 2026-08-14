import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface TokenAttributes {
    id: number
    userId: number
    token: string
    expiresAt: Date
}

type TokenCreationAttributes = Optional<TokenAttributes, "id">;

class Token extends Model<TokenAttributes, TokenCreationAttributes> implements TokenAttributes{
    id!: number;
    userId!: number;
    token!: string;
    expiresAt!: Date;
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
    token: {
        type: DataTypes.STRING(64)
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
},{
    sequelize: db,
    tableName: "tokens",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
}
)

export default Token
