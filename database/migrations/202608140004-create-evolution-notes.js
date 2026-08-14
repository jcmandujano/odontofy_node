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
      'evolution_notes',
      {
        id: idColumn(Sequelize),
        patient_id: referenceColumn(Sequelize, 'patients'),
        treatment_plan_id: nullableReferenceColumn(Sequelize, 'treatment_plans'),
        treatment_plan_item_id: nullableReferenceColumn(
          Sequelize,
          'treatment_plan_items'
        ),
        note: { type: Sequelize.TEXT, allowNull: false },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('evolution_notes', ['patient_id', 'created_at'], {
      name: 'idx_evolution_notes_patient_created',
    });
    await queryInterface.addIndex(
      'evolution_notes',
      ['treatment_plan_id', 'created_at'],
      { name: 'idx_evolution_notes_treatment_plan' }
    );
    await queryInterface.addIndex(
      'evolution_notes',
      ['treatment_plan_item_id', 'created_at'],
      { name: 'idx_evolution_notes_treatment_plan_item' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('evolution_notes');
  },
};
