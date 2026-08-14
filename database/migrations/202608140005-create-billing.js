const {
  addCheck,
  idColumn,
  referenceColumn,
  tableOptions,
  timestampColumns,
} = require('../support/schema');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'payments',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        patient_id: referenceColumn(Sequelize, 'patients'),
        payment_date: { type: Sequelize.DATEONLY, allowNull: false },
        amount_received: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        balance_after: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        total_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        discount_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('payments', ['user_id', 'payment_date'], {
      name: 'idx_payments_user_date',
    });
    await queryInterface.addIndex('payments', ['patient_id', 'payment_date'], {
      name: 'idx_payments_patient_date',
    });
    await addCheck(
      queryInterface,
      'payments',
      'chk_payments_amounts_nonnegative',
      '`amount_received` >= 0 AND `total_amount` >= 0 AND `discount_amount` >= 0'
    );

    await queryInterface.createTable(
      'payment_items',
      {
        id: idColumn(Sequelize),
        payment_id: referenceColumn(Sequelize, 'payments'),
        user_concept_id: referenceColumn(Sequelize, 'user_concepts', 'RESTRICT'),
        payment_method: {
          type: Sequelize.ENUM('CASH', 'DEBIT', 'CREDIT', 'TRANSFERENCE'),
          allowNull: false,
          defaultValue: 'CASH',
        },
        quantity: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 1,
        },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('payment_items', ['payment_id', 'id'], {
      name: 'idx_payment_items_payment',
    });
    await queryInterface.addIndex('payment_items', ['user_concept_id'], {
      name: 'idx_payment_items_user_concept',
    });
    await addCheck(
      queryInterface,
      'payment_items',
      'chk_payment_items_quantity_positive',
      '`quantity` > 0'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payment_items');
    await queryInterface.dropTable('payments');
  },
};
