import { DataTypes, Model, Optional } from 'sequelize';
import db from '../db/connection';

interface AuthSessionAttributes {
  id: number;
  user_id: number;
  token_hash: string;
  family_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  user_agent: string | null;
  ip_address: string | null;
}

interface AuthSessionCreationAttributes extends Optional<AuthSessionAttributes, 'id' | 'revoked_at' | 'user_agent' | 'ip_address'> {}

class AuthSession extends Model<AuthSessionAttributes, AuthSessionCreationAttributes> implements AuthSessionAttributes {
  id!: number;
  user_id!: number;
  token_hash!: string;
  family_id!: string;
  expires_at!: Date;
  revoked_at!: Date | null;
  user_agent!: string | null;
  ip_address!: string | null;
}

AuthSession.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  family_id: { type: DataTypes.STRING(36), allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  revoked_at: { type: DataTypes.DATE, allowNull: true },
  user_agent: { type: DataTypes.STRING(512), allowNull: true },
  ip_address: { type: DataTypes.STRING(64), allowNull: true }
}, {
  sequelize: db,
  tableName: 'auth_sessions',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default AuthSession;
