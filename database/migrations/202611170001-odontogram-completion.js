module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('odontograms', 'is_completed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })
  },
  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query('SELECT COUNT(*) AS total FROM odontograms WHERE is_completed = 1')
    if (Number(rows[0].total)) throw new Error('Cannot rollback while completed odontograms exist; completion state must be preserved.')
    await queryInterface.removeColumn('odontograms', 'is_completed')
  },
}
