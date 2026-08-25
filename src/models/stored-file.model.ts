import { DataTypes, Model, Optional } from 'sequelize';

import db from '../db/connection';
import {
  FILE_PURPOSES,
  FilePurpose,
  STORED_FILE_STATUSES,
  StoredFileStatus,
} from '../types/file.enums';

interface StoredFileAttributes {
  id: number;
  public_id: string;
  user_id: number;
  purpose: FilePurpose;
  provider: 'GCS';
  bucket: string;
  object_key: string;
  original_name: string;
  media_type: string;
  size_bytes: string | number;
  sha256: string;
  generation: string | null;
  status: StoredFileStatus;
  security_status: 'BASIC_VALIDATED';
  failure_code: string | null;
  deleted_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type StoredFileCreation = Optional<StoredFileAttributes, 'id' | 'provider' | 'generation' | 'status' | 'security_status' | 'failure_code' | 'deleted_at' | 'createdAt' | 'updatedAt'>;

class StoredFile extends Model<StoredFileAttributes, StoredFileCreation> implements StoredFileAttributes {
  id!: number;
  public_id!: string;
  user_id!: number;
  purpose!: FilePurpose;
  provider!: 'GCS';
  bucket!: string;
  object_key!: string;
  original_name!: string;
  media_type!: string;
  size_bytes!: string | number;
  sha256!: string;
  generation!: string | null;
  status!: StoredFileStatus;
  security_status!: 'BASIC_VALIDATED';
  failure_code!: string | null;
  deleted_at!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

StoredFile.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  public_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  purpose: { type: DataTypes.ENUM(...FILE_PURPOSES), allowNull: false },
  provider: { type: DataTypes.ENUM('GCS'), allowNull: false, defaultValue: 'GCS' },
  bucket: { type: DataTypes.STRING(255), allowNull: false },
  object_key: { type: DataTypes.STRING(512), allowNull: false },
  original_name: { type: DataTypes.STRING(255), allowNull: false },
  media_type: { type: DataTypes.STRING(100), allowNull: false },
  size_bytes: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  sha256: { type: DataTypes.CHAR(64), allowNull: false },
  generation: { type: DataTypes.STRING(64), allowNull: true },
  status: { type: DataTypes.ENUM(...STORED_FILE_STATUSES), allowNull: false, defaultValue: 'PENDING' },
  security_status: { type: DataTypes.ENUM('BASIC_VALIDATED'), allowNull: false, defaultValue: 'BASIC_VALIDATED' },
  failure_code: { type: DataTypes.STRING(64), allowNull: true },
  deleted_at: { type: DataTypes.DATE, allowNull: true },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, { sequelize: db, tableName: 'stored_files', timestamps: true });

export default StoredFile;
