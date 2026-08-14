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
      'concepts',
      {
        id: idColumn(Sequelize),
        description: { type: Sequelize.STRING(255), allowNull: false },
        unit_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('concepts', ['description'], {
      name: 'uq_concepts_description',
      unique: true,
    });
    await addCheck(
      queryInterface,
      'concepts',
      'chk_concepts_unit_price_nonnegative',
      '`unit_price` >= 0'
    );

    await queryInterface.createTable(
      'user_concepts',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        concept_id: nullableReferenceColumn(Sequelize, 'concepts'),
        description: { type: Sequelize.STRING(255), allowNull: false },
        unit_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        is_custom: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('user_concepts', ['user_id', 'created_at'], {
      name: 'idx_user_concepts_user_created',
    });
    await queryInterface.addIndex('user_concepts', ['user_id', 'concept_id'], {
      name: 'uq_user_concepts_user_catalog',
      unique: true,
    });
    await addCheck(
      queryInterface,
      'user_concepts',
      'chk_user_concepts_unit_price_nonnegative',
      '`unit_price` >= 0'
    );

    await queryInterface.createTable(
      'treatment_plans',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        patient_id: referenceColumn(Sequelize, 'patients'),
        title: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        diagnosis: { type: Sequelize.TEXT, allowNull: true },
        patient_complaint: { type: Sequelize.TEXT, allowNull: true },
        clinical_observations: { type: Sequelize.TEXT, allowNull: true },
        prognosis: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM(
            'DRAFT',
            'PROPOSED',
            'ACCEPTED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED'
          ),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        estimated_start_date: { type: Sequelize.DATE, allowNull: true },
        estimated_end_date: { type: Sequelize.DATE, allowNull: true },
        accepted_at: { type: Sequelize.DATE, allowNull: true },
        rejected_at: { type: Sequelize.DATE, allowNull: true },
        acceptance_notes: { type: Sequelize.TEXT, allowNull: true },
        subtotal_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        discount_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        total_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('treatment_plans', ['user_id', 'patient_id'], {
      name: 'idx_treatment_plans_user_patient',
    });
    await queryInterface.addIndex('treatment_plans', ['patient_id', 'created_at'], {
      name: 'idx_treatment_plans_patient_created',
    });
    await queryInterface.addIndex('treatment_plans', ['user_id', 'status'], {
      name: 'idx_treatment_plans_user_status',
    });
    await addCheck(
      queryInterface,
      'treatment_plans',
      'chk_treatment_plans_amounts_nonnegative',
      '`subtotal_amount` >= 0 AND `discount_amount` >= 0'
    );
    await addCheck(
      queryInterface,
      'treatment_plans',
      'chk_treatment_plans_total_consistent',
      '`total_amount` = `subtotal_amount` - `discount_amount`'
    );
    await addCheck(
      queryInterface,
      'treatment_plans',
      'chk_treatment_plans_estimated_range',
      '`estimated_end_date` IS NULL OR `estimated_start_date` IS NULL OR `estimated_end_date` >= `estimated_start_date`'
    );

    await queryInterface.createTable(
      'treatment_plan_items',
      {
        id: idColumn(Sequelize),
        treatment_plan_id: referenceColumn(Sequelize, 'treatment_plans'),
        user_concept_id: nullableReferenceColumn(Sequelize, 'user_concepts'),
        name: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        tooth: { type: Sequelize.STRING(50), allowNull: true },
        area: { type: Sequelize.STRING(100), allowNull: true },
        quantity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 1,
        },
        unit_price_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        subtotal_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        phase: { type: Sequelize.STRING(100), allowNull: true },
        priority: {
          type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM(
            'PENDING',
            'APPROVED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED'
          ),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        sort_order: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex(
      'treatment_plan_items',
      ['treatment_plan_id', 'sort_order'],
      { name: 'idx_treatment_plan_items_plan_sort' }
    );
    await queryInterface.addIndex('treatment_plan_items', ['user_concept_id'], {
      name: 'idx_treatment_plan_items_user_concept',
    });
    await queryInterface.addIndex('treatment_plan_items', ['status'], {
      name: 'idx_treatment_plan_items_status',
    });
    await addCheck(
      queryInterface,
      'treatment_plan_items',
      'chk_treatment_plan_items_quantity_positive',
      '`quantity` > 0'
    );
    await addCheck(
      queryInterface,
      'treatment_plan_items',
      'chk_treatment_plan_items_amounts_nonnegative',
      '`unit_price_amount` >= 0 AND `subtotal_amount` >= 0'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('treatment_plan_items');
    await queryInterface.dropTable('treatment_plans');
    await queryInterface.dropTable('user_concepts');
    await queryInterface.dropTable('concepts');
  },
};
