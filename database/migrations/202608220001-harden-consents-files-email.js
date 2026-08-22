const {
  idColumn,
  nullableReferenceColumn,
  referenceColumn,
  tableOptions,
  timestampColumns,
} = require('../support/schema');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'stored_files',
      {
        id: idColumn(Sequelize),
        public_id: { type: Sequelize.UUID, allowNull: false },
        user_id: referenceColumn(Sequelize, 'users'),
        purpose: {
          type: Sequelize.ENUM('CONSENT_TEMPLATE', 'SIGNED_CONSENT'),
          allowNull: false,
        },
        provider: {
          type: Sequelize.ENUM('GCS'),
          allowNull: false,
          defaultValue: 'GCS',
        },
        bucket: { type: Sequelize.STRING(255), allowNull: false },
        object_key: { type: Sequelize.STRING(512), allowNull: false },
        original_name: { type: Sequelize.STRING(255), allowNull: false },
        media_type: { type: Sequelize.STRING(100), allowNull: false },
        size_bytes: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        sha256: { type: Sequelize.CHAR(64), allowNull: false },
        generation: { type: Sequelize.STRING(64), allowNull: true },
        status: {
          type: Sequelize.ENUM('PENDING', 'AVAILABLE', 'DELETING', 'FAILED', 'DELETED'),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        security_status: {
          type: Sequelize.ENUM('BASIC_VALIDATED'),
          allowNull: false,
          defaultValue: 'BASIC_VALIDATED',
        },
        failure_code: { type: Sequelize.STRING(64), allowNull: true },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('stored_files', ['public_id'], {
      name: 'uq_stored_files_public_id',
      unique: true,
    });
    await queryInterface.addIndex('stored_files', ['bucket', 'object_key'], {
      name: 'uq_stored_files_provider_object',
      unique: true,
    });
    await queryInterface.addIndex('stored_files', ['user_id', 'status', 'created_at'], {
      name: 'idx_stored_files_user_status_created',
    });

    await queryInterface.addColumn('user_informed_consents', 'template_file_id',
      nullableReferenceColumn(Sequelize, 'stored_files', 'RESTRICT'));
    await queryInterface.addColumn('user_informed_consents', 'status', {
      type: Sequelize.ENUM('ACTIVE', 'ARCHIVED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    });
    await queryInterface.addColumn('user_informed_consents', 'version', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    });
    await queryInterface.addColumn('user_informed_consents', 'archived_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.sequelize.query(`
      UPDATE user_informed_consents u
      LEFT JOIN informed_consents i ON i.id = u.informed_consent_id
      SET u.name = COALESCE(NULLIF(TRIM(u.name), ''), i.name, 'Consentimiento'),
          u.description = COALESCE(u.description, i.description)
    `);
    await queryInterface.changeColumn('user_informed_consents', 'name', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
    await queryInterface.removeColumn('user_informed_consents', 'file_url');
    await queryInterface.removeColumn('informed_consents', 'file_url');
    await queryInterface.addIndex('user_informed_consents', ['user_id', 'status', 'created_at'], {
      name: 'idx_user_consents_user_status_created',
    });

    await queryInterface.addColumn('signed_consents', 'template_file_id_snapshot',
      nullableReferenceColumn(Sequelize, 'stored_files', 'RESTRICT'));
    await queryInterface.addColumn('signed_consents', 'signed_file_id',
      nullableReferenceColumn(Sequelize, 'stored_files', 'RESTRICT'));
    await queryInterface.addColumn('signed_consents', 'status', {
      type: Sequelize.ENUM('PENDING_DOCUMENT', 'COMPLETED', 'VOIDED'),
      allowNull: false,
      defaultValue: 'PENDING_DOCUMENT',
    });
    await queryInterface.addColumn('signed_consents', 'template_version', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    });
    for (const [column, length] of [
      ['template_name_snapshot', 255],
      ['patient_name_snapshot', 350],
      ['doctor_name_snapshot', 350],
      ['signatory_name', 350],
    ]) {
      await queryInterface.addColumn('signed_consents', column, {
        type: Sequelize.STRING(length),
        allowNull: true,
      });
    }
    await queryInterface.addColumn('signed_consents', 'template_description_snapshot', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('signed_consents', 'signatory_capacity', {
      type: Sequelize.ENUM('PATIENT', 'REPRESENTATIVE'),
      allowNull: true,
    });
    await queryInterface.addColumn('signed_consents', 'voided_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('signed_consents', 'void_reason', {
      type: Sequelize.STRING(1000),
      allowNull: true,
    });
    await queryInterface.sequelize.query(`
      UPDATE signed_consents s
      JOIN user_informed_consents c ON c.id = s.user_informed_consent_id
      JOIN patients p ON p.id = s.patient_id
      JOIN users u ON u.id = s.doctor_id
      SET s.template_version = c.version,
          s.template_name_snapshot = c.name,
          s.template_description_snapshot = c.description,
          s.patient_name_snapshot = TRIM(CONCAT_WS(' ', p.name, p.middle_name, p.last_name)),
          s.doctor_name_snapshot = TRIM(CONCAT_WS(' ', u.name, u.middle_name, u.last_name)),
          s.signatory_name = TRIM(CONCAT_WS(' ', p.name, p.middle_name, p.last_name)),
          s.signatory_capacity = 'PATIENT',
          s.status = 'PENDING_DOCUMENT'
    `);
    for (const column of [
      'template_name_snapshot',
      'patient_name_snapshot',
      'doctor_name_snapshot',
      'signatory_name',
    ]) {
      const length = column === 'template_name_snapshot' ? 255 : 350;
      await queryInterface.changeColumn('signed_consents', column, {
        type: Sequelize.STRING(length),
        allowNull: false,
      });
    }
    await queryInterface.changeColumn('signed_consents', 'signatory_capacity', {
      type: Sequelize.ENUM('PATIENT', 'REPRESENTATIVE'),
      allowNull: false,
    });
    await queryInterface.removeColumn('signed_consents', 'file_url');
    await queryInterface.addIndex('signed_consents', ['signed_file_id'], {
      name: 'uq_signed_consents_file',
      unique: true,
    });
    await queryInterface.addIndex('signed_consents', ['doctor_id', 'patient_id', 'status', 'signed_at'], {
      name: 'idx_signed_consents_owner_patient_status_signed',
    });

    await queryInterface.createTable(
      'email_deliveries',
      {
        id: idColumn(Sequelize),
        public_id: { type: Sequelize.UUID, allowNull: false },
        user_id: nullableReferenceColumn(Sequelize, 'users', 'SET NULL'),
        kind: {
          type: Sequelize.ENUM('ACCOUNT_VERIFICATION', 'PASSWORD_RESET'),
          allowNull: false,
        },
        idempotency_key: { type: Sequelize.UUID, allowNull: false },
        encrypted_payload: { type: Sequelize.TEXT('long'), allowNull: false },
        key_version: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 1,
        },
        status: {
          type: Sequelize.ENUM('PENDING', 'SENT', 'FAILED'),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        attempts: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        available_at: { type: Sequelize.DATE, allowNull: false },
        locked_at: { type: Sequelize.DATE, allowNull: true },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        provider_message_id: { type: Sequelize.STRING(255), allowNull: true },
        last_error_code: { type: Sequelize.STRING(64), allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('email_deliveries', ['public_id'], {
      name: 'uq_email_deliveries_public_id',
      unique: true,
    });
    await queryInterface.addIndex('email_deliveries', ['idempotency_key'], {
      name: 'uq_email_deliveries_idempotency',
      unique: true,
    });
    await queryInterface.addIndex('email_deliveries', ['status', 'available_at', 'locked_at'], {
      name: 'idx_email_deliveries_due',
    });
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('email_deliveries')) {
      await queryInterface.dropTable('email_deliveries');
    }
    const signedIndexes = await queryInterface.showIndex('signed_consents');
    if (signedIndexes.some((index) => index.name === 'idx_signed_consents_owner_patient_status_signed')) {
      await queryInterface.removeIndex('signed_consents', 'idx_signed_consents_owner_patient_status_signed');
    }
    await queryInterface.addColumn('signed_consents', 'file_url', {
      type: Sequelize.STRING(2048),
      allowNull: true,
    });
    for (const column of [
      'void_reason', 'voided_at', 'signatory_capacity', 'signatory_name',
      'doctor_name_snapshot', 'patient_name_snapshot',
      'template_description_snapshot', 'template_name_snapshot',
      'template_version', 'status', 'signed_file_id', 'template_file_id_snapshot',
    ]) await queryInterface.removeColumn('signed_consents', column);

    await queryInterface.removeIndex('user_informed_consents', 'idx_user_consents_user_status_created');
    await queryInterface.addColumn('informed_consents', 'file_url', {
      type: Sequelize.STRING(2048), allowNull: true,
    });
    await queryInterface.addColumn('user_informed_consents', 'file_url', {
      type: Sequelize.STRING(2048), allowNull: true,
    });
    await queryInterface.changeColumn('user_informed_consents', 'name', {
      type: Sequelize.STRING(255), allowNull: true,
    });
    for (const column of ['archived_at', 'version', 'status', 'template_file_id'])
      await queryInterface.removeColumn('user_informed_consents', column);
    await queryInterface.dropTable('stored_files');
  },
};
