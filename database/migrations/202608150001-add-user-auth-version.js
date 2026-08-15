'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'auth_version', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      after: 'status',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'auth_version');
  },
};
