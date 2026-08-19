import { DataTypes, Model, Optional } from 'sequelize';
import db from '../db/connection';

interface OAuthStateAttributes { id: number; user_id: number; state_hash: string; provider: 'GOOGLE'; code_verifier_ciphertext: string | null; expires_at: Date; used_at: Date | null; }
type OAuthStateCreationAttributes = Optional<OAuthStateAttributes, 'id' | 'provider' | 'code_verifier_ciphertext' | 'used_at'>;

class OAuthState extends Model<OAuthStateAttributes, OAuthStateCreationAttributes> implements OAuthStateAttributes {
  id!: number;
  user_id!: number;
  state_hash!: string;
  provider!: 'GOOGLE';
  code_verifier_ciphertext!: string | null;
  expires_at!: Date;
  used_at!: Date | null;
}

OAuthState.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  state_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  provider: { type: DataTypes.ENUM('GOOGLE'), allowNull: false, defaultValue: 'GOOGLE' },
  code_verifier_ciphertext: { type: DataTypes.TEXT, allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  used_at: { type: DataTypes.DATE, allowNull: true }
}, { sequelize: db, tableName: 'oauth_states', createdAt: 'created_at', updatedAt: 'updated_at' });

export default OAuthState;
