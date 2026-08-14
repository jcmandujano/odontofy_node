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
      'informed_consents',
      {
        id: idColumn(Sequelize),
        name: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        file_url: { type: Sequelize.STRING(2048), allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('informed_consents', ['name'], {
      name: 'uq_informed_consents_name',
      unique: true,
    });

    await queryInterface.createTable(
      'user_informed_consents',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        informed_consent_id: nullableReferenceColumn(
          Sequelize,
          'informed_consents'
        ),
        name: { type: Sequelize.STRING(255), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        file_url: { type: Sequelize.STRING(2048), allowNull: true },
        is_custom: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex(
      'user_informed_consents',
      ['user_id', 'created_at'],
      { name: 'idx_user_informed_consents_user_created' }
    );
    await queryInterface.addIndex(
      'user_informed_consents',
      ['user_id', 'informed_consent_id'],
      { name: 'uq_user_informed_consents_user_catalog', unique: true }
    );

    await queryInterface.createTable(
      'signed_consents',
      {
        id: idColumn(Sequelize),
        user_informed_consent_id: referenceColumn(
          Sequelize,
          'user_informed_consents',
          'RESTRICT'
        ),
        patient_id: referenceColumn(Sequelize, 'patients'),
        doctor_id: referenceColumn(Sequelize, 'users'),
        signed_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        file_url: { type: Sequelize.STRING(2048), allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('signed_consents', ['doctor_id', 'signed_at'], {
      name: 'idx_signed_consents_doctor_signed',
    });
    await queryInterface.addIndex('signed_consents', ['patient_id', 'signed_at'], {
      name: 'idx_signed_consents_patient_signed',
    });
    await queryInterface.addIndex('signed_consents', ['user_informed_consent_id'], {
      name: 'idx_signed_consents_user_consent',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('signed_consents');
    await queryInterface.dropTable('user_informed_consents');
    await queryInterface.dropTable('informed_consents');
  },
};
