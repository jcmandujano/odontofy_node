const {
  addCheck,
  idColumn,
  nullableReferenceColumn,
  referenceColumn,
  tableOptions,
  timestampColumns,
} = require('../support/schema');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'patients',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        name: { type: Sequelize.STRING(100), allowNull: false },
        middle_name: { type: Sequelize.STRING(100), allowNull: true },
        last_name: { type: Sequelize.STRING(150), allowNull: false },
        gender: { type: Sequelize.STRING(50), allowNull: true },
        date_of_birth: { type: Sequelize.DATE, allowNull: true },
        phone: { type: Sequelize.STRING(30), allowNull: true },
        marital_status: { type: Sequelize.STRING(50), allowNull: true },
        occupation: { type: Sequelize.STRING(150), allowNull: true },
        address: { type: Sequelize.TEXT, allowNull: true },
        emergency_contact_name: { type: Sequelize.STRING(200), allowNull: true },
        emergency_contact_phone: { type: Sequelize.STRING(30), allowNull: true },
        emergency_contact_relationship: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        reason_for_consultation: { type: Sequelize.TEXT, allowNull: true },
        rfc: { type: Sequelize.STRING(13), allowNull: true },
        family_medical_history: { type: Sequelize.JSON, allowNull: true },
        personal_medical_history: { type: Sequelize.JSON, allowNull: true },
        email: { type: Sequelize.STRING(254), allowNull: true },
        status: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        current_balance: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('patients', ['user_id', 'status', 'created_at'], {
      name: 'idx_patients_user_status_created',
    });
    await queryInterface.addIndex('patients', ['user_id', 'last_name', 'name'], {
      name: 'idx_patients_user_name',
    });

    await queryInterface.createTable(
      'appointments',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        patient_id: nullableReferenceColumn(Sequelize, 'patients'),
        starts_at: { type: Sequelize.DATE, allowNull: false },
        ends_at: { type: Sequelize.DATE, allowNull: true },
        status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'pendiente',
        },
        reason: { type: Sequelize.STRING(255), allowNull: true },
        note: { type: Sequelize.TEXT, allowNull: true },
        external_event_id: { type: Sequelize.STRING(255), allowNull: true },
        source: {
          type: Sequelize.ENUM('local', 'google'),
          allowNull: false,
          defaultValue: 'local',
        },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('appointments', ['user_id', 'starts_at'], {
      name: 'idx_appointments_user_starts_at',
    });
    await queryInterface.addIndex('appointments', ['patient_id', 'starts_at'], {
      name: 'idx_appointments_patient_starts_at',
    });
    await queryInterface.addIndex('appointments', ['user_id', 'external_event_id'], {
      name: 'uq_appointments_user_external_event',
      unique: true,
    });
    await addCheck(
      queryInterface,
      'appointments',
      'chk_appointments_valid_range',
      '`ends_at` IS NULL OR `ends_at` > `starts_at`'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('appointments');
    await queryInterface.dropTable('patients');
  },
};
