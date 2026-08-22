const {
  addCheck,
  idColumn,
  referenceColumn,
  tableOptions,
  timestampColumns,
} = require('../support/schema');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'time_zone', {
      type: Sequelize.STRING(64),
      allowNull: false,
      defaultValue: 'America/Mexico_City',
    });
    await queryInterface.addColumn('appointments', 'cancelled_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('appointments', 'sync_status', {
      type: Sequelize.ENUM('NOT_CONNECTED', 'PENDING', 'SYNCED', 'FAILED'),
      allowNull: false,
      defaultValue: 'NOT_CONNECTED',
    });
    await queryInterface.addColumn('appointments', 'sync_version', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    });
    await queryInterface.addColumn('appointments', 'synced_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('appointments', 'sync_error_code', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('appointments', 'external_etag', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      'UPDATE appointments SET ends_at = DATE_ADD(starts_at, INTERVAL 1 HOUR) WHERE ends_at IS NULL'
    );
    await queryInterface.sequelize.query(`
      UPDATE appointments
      SET status = CASE LOWER(status)
        WHEN 'confirmada' THEN 'CONFIRMED'
        WHEN 'confirmed' THEN 'CONFIRMED'
        WHEN 'completada' THEN 'COMPLETED'
        WHEN 'completed' THEN 'COMPLETED'
        WHEN 'cancelada' THEN 'CANCELLED'
        WHEN 'cancelled' THEN 'CANCELLED'
        WHEN 'no_show' THEN 'NO_SHOW'
        ELSE 'SCHEDULED'
      END
    `);
    await queryInterface.changeColumn('appointments', 'ends_at', {
      type: Sequelize.DATE,
      allowNull: false,
    });
    await queryInterface.changeColumn('appointments', 'status', {
      type: Sequelize.ENUM(
        'SCHEDULED',
        'CONFIRMED',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW'
      ),
      allowNull: false,
      defaultValue: 'SCHEDULED',
    });
    await queryInterface.addIndex(
      'appointments',
      ['user_id', 'status', 'starts_at'],
      { name: 'idx_appointments_user_status_starts' }
    );

    await queryInterface.createTable(
      'calendar_connections',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        provider: {
          type: Sequelize.ENUM('GOOGLE'),
          allowNull: false,
          defaultValue: 'GOOGLE',
        },
        encrypted_refresh_token: { type: Sequelize.TEXT, allowNull: false },
        token_key_version: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 1,
        },
        calendar_id: {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: 'primary',
        },
        scopes: { type: Sequelize.JSON, allowNull: false },
        status: {
          type: Sequelize.ENUM('ACTIVE', 'REAUTH_REQUIRED', 'DISCONNECTED'),
          allowNull: false,
          defaultValue: 'ACTIVE',
        },
        connected_at: { type: Sequelize.DATE, allowNull: false },
        disconnected_at: { type: Sequelize.DATE, allowNull: true },
        last_sync_at: { type: Sequelize.DATE, allowNull: true },
        last_error_code: { type: Sequelize.STRING(64), allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('calendar_connections', ['user_id'], {
      name: 'uq_calendar_connections_user',
      unique: true,
    });

    await queryInterface.createTable(
      'calendar_sync_jobs',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        appointment_id: referenceColumn(
          Sequelize,
          'appointments',
          'CASCADE'
        ),
        operation: {
          type: Sequelize.ENUM('UPSERT', 'DELETE'),
          allowNull: false,
        },
        version: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
        },
        attempts: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        available_at: { type: Sequelize.DATE, allowNull: false },
        locked_at: { type: Sequelize.DATE, allowNull: true },
        processed_at: { type: Sequelize.DATE, allowNull: true },
        last_error_code: { type: Sequelize.STRING(64), allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('calendar_sync_jobs', ['appointment_id'], {
      name: 'uq_calendar_sync_jobs_appointment',
      unique: true,
    });
    await queryInterface.addIndex(
      'calendar_sync_jobs',
      ['processed_at', 'available_at', 'locked_at'],
      { name: 'idx_calendar_sync_jobs_due' }
    );

    await queryInterface.addColumn('oauth_states', 'provider', {
      type: Sequelize.ENUM('GOOGLE'),
      allowNull: false,
      defaultValue: 'GOOGLE',
    });
    await queryInterface.addColumn('oauth_states', 'code_verifier_ciphertext', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.removeColumn('users', 'google_access_token');
    await queryInterface.removeColumn('users', 'google_refresh_token');
    await queryInterface.removeColumn('users', 'google_token_expiry_at');

    await addCheck(
      queryInterface,
      'appointments',
      'chk_appointments_cancelled_at',
      "(`status` = 'CANCELLED' AND `cancelled_at` IS NOT NULL) OR (`status` <> 'CANCELLED' AND `cancelled_at` IS NULL)"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'google_access_token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'google_refresh_token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'google_token_expiry_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.removeColumn('oauth_states', 'code_verifier_ciphertext');
    await queryInterface.removeColumn('oauth_states', 'provider');
    await queryInterface.dropTable('calendar_sync_jobs');
    await queryInterface.dropTable('calendar_connections');
    await queryInterface.removeIndex(
      'appointments',
      'idx_appointments_user_status_starts'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `appointments` DROP CHECK `chk_appointments_cancelled_at`'
    );
    await queryInterface.changeColumn('appointments', 'status', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'pendiente',
    });
    await queryInterface.changeColumn('appointments', 'ends_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    for (const column of [
      'external_etag',
      'sync_error_code',
      'synced_at',
      'sync_version',
      'sync_status',
      'cancelled_at',
      'time_zone',
    ]) {
      await queryInterface.removeColumn('appointments', column);
    }
  },
};
