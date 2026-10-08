const {
  idColumn,
  referenceColumn,
  tableOptions,
  timestampColumns,
} = require('../support/schema');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'odontogram_finding_treatment_items',
      {
        id: idColumn(Sequelize),
        finding_id: referenceColumn(Sequelize, 'odontogram_findings', 'CASCADE'),
        treatment_plan_item_id: referenceColumn(
          Sequelize,
          'treatment_plan_items',
          'CASCADE'
        ),
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex(
      'odontogram_finding_treatment_items',
      ['finding_id', 'treatment_plan_item_id'],
      { name: 'uq_odontogram_finding_treatment_item', unique: true }
    );
    await queryInterface.addIndex(
      'odontogram_finding_treatment_items',
      ['treatment_plan_item_id'],
      { name: 'idx_odontogram_links_treatment_item' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('odontogram_finding_treatment_items');
  },
};
