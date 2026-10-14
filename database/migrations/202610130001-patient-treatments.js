module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('treatment_plan_items', 'patient_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'patients', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    await queryInterface.sequelize.query(`
      UPDATE treatment_plan_items i
      JOIN treatment_plans p ON p.id = i.treatment_plan_id
      SET i.patient_id = p.patient_id
    `);
    await queryInterface.changeColumn('treatment_plan_items', 'patient_id', {
      type: Sequelize.INTEGER.UNSIGNED, allowNull: false,
    });
    // Preserve the existing foreign key and its deletion policy.
    await queryInterface.sequelize.query(
      'ALTER TABLE treatment_plan_items MODIFY treatment_plan_id INT UNSIGNED NULL'
    );
    await queryInterface.addIndex('treatment_plan_items', ['patient_id', 'treatment_plan_id', 'id'], {
      name: 'idx_patient_treatments_plan',
    });
  },
  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS total FROM treatment_plan_items WHERE treatment_plan_id IS NULL'
    );
    if (Number(rows[0].total)) {
      throw new Error('Cannot rollback while independent patient treatments exist; no records were deleted.');
    }
    const keys = await queryInterface.getForeignKeyReferencesForTable('treatment_plan_items');
    for (const key of keys.filter(key => key.columnName === 'patient_id')) {
      await queryInterface.removeConstraint('treatment_plan_items', key.constraintName);
    }
    await queryInterface.removeIndex('treatment_plan_items', 'idx_patient_treatments_plan');
    await queryInterface.sequelize.query(
      'ALTER TABLE treatment_plan_items MODIFY treatment_plan_id INT UNSIGNED NOT NULL'
    );
    await queryInterface.removeColumn('treatment_plan_items', 'patient_id');
  },
};
