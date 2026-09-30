const {
  idColumn,
  referenceColumn,
  tableOptions,
  timestampColumns,
} = require('../support/schema');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'odontograms',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users', 'RESTRICT'),
        patient_id: referenceColumn(Sequelize, 'patients', 'RESTRICT'),
        dentition: {
          type: Sequelize.ENUM('ADULT', 'PEDIATRIC'),
          allowNull: false,
        },
        title: { type: Sequelize.STRING(255), allowNull: true },
        author_user_id: referenceColumn(Sequelize, 'users', 'RESTRICT'),
        author_name: { type: Sequelize.STRING(350), allowNull: false },
        occurred_at: { type: Sequelize.DATE, allowNull: false },
        archived_at: { type: Sequelize.DATE, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex(
      'odontograms',
      ['user_id', 'patient_id', 'occurred_at'],
      { name: 'idx_odontograms_user_patient_occurred' }
    );
    await queryInterface.addIndex(
      'odontograms',
      ['patient_id', 'dentition', 'archived_at'],
      { name: 'idx_odontograms_patient_dentition_archive' }
    );

    await queryInterface.createTable(
      'odontogram_findings',
      {
        id: idColumn(Sequelize),
        odontogram_id: referenceColumn(
          Sequelize,
          'odontograms',
          'CASCADE'
        ),
        tooth_code: { type: Sequelize.STRING(2), allowNull: false },
        condition: {
          type: Sequelize.ENUM(
            'HEALTHY',
            'MISSING',
            'NOT_ERUPTED',
            'RESTORATION',
            'CROWN',
            'ROOT_CANAL',
            'IMPLANT',
            'CARIES',
            'FRACTURE',
            'EXTRACTION_INDICATED',
            'OTHER'
          ),
          allowNull: false,
        },
        surface: {
          type: Sequelize.ENUM(
            'MESIAL',
            'DISTAL',
            'VESTIBULAR',
            'LINGUAL_PALATAL',
            'OCCLUSAL_INCISAL'
          ),
          allowNull: true,
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex(
      'odontogram_findings',
      ['odontogram_id', 'tooth_code'],
      { name: 'idx_odontogram_findings_chart_tooth' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('odontogram_findings');
    await queryInterface.dropTable('odontograms');
  },
};
