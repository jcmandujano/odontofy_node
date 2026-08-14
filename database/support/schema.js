const identifierPattern = /^[a-z0-9_]+$/;

const assertIdentifier = (value) => {
  if (!identifierPattern.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
};

const idColumn = (Sequelize) => ({
  type: Sequelize.INTEGER.UNSIGNED,
  allowNull: false,
  autoIncrement: true,
  primaryKey: true,
});

const timestampColumns = (Sequelize) => ({
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
});

const referenceColumn = (Sequelize, table, onDelete = 'CASCADE') => ({
  type: Sequelize.INTEGER.UNSIGNED,
  allowNull: false,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete,
});

const nullableReferenceColumn = (Sequelize, table, onDelete = 'SET NULL') => ({
  ...referenceColumn(Sequelize, table, onDelete),
  allowNull: true,
});

const tableOptions = {
  engine: 'InnoDB',
  charset: 'utf8mb4',
  collate: 'utf8mb4_0900_ai_ci',
};

const addCheck = async (queryInterface, table, name, expression) => {
  assertIdentifier(table);
  assertIdentifier(name);
  await queryInterface.sequelize.query(
    `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` CHECK (${expression})`
  );
};

module.exports = {
  addCheck,
  idColumn,
  nullableReferenceColumn,
  referenceColumn,
  tableOptions,
  timestampColumns,
};
