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
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        field: 'user_id'
    },
    token: {
        type: DataTypes.STRING(64),
        field: 'token_hash'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
    }
},{
    sequelize: db,
    tableName: "account_verification_tokens",
    underscored: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
}
)

export default Token
