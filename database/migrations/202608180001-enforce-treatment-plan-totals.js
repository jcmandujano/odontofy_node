const { addCheck } = require('../support/schema');

const constraintName = 'chk_treatment_plans_discount_within_subtotal';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE treatment_plans
       SET discount_amount = subtotal_amount, total_amount = 0
       WHERE discount_amount > subtotal_amount OR total_amount < 0`
    );
    await addCheck(
      queryInterface,
      'treatment_plans',
      constraintName,
      '`discount_amount` <= `subtotal_amount` AND `total_amount` >= 0'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`treatment_plans\` DROP CHECK \`${constraintName}\``
    );
  },
};
