module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('concepts', [
      {
        id: 1,
        description: 'Consulta dental de desarrollo',
        unit_price: 500,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        description: 'Limpieza dental de desarrollo',
        unit_price: 800,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        description: 'Radiografia dental de desarrollo',
        unit_price: 350,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('informed_consents', [
      {
        id: 1,
        name: 'Consentimiento general de desarrollo',
        description: 'Plantilla sintetica sin valor legal.',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        name: 'Consentimiento de procedimiento de desarrollo',
        description: 'Plantilla sintetica para pruebas locales.',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('informed_consents', { id: [1, 2] });
    await queryInterface.bulkDelete('concepts', { id: [1, 2, 3] });
  },
};
