const {
  addCheck,
  idColumn,
  referenceColumn,
  tableOptions,
} = require('../support/schema')

const totalsCheck = 'chk_billing_records_exact_totals'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_concepts', 'active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    })
    await queryInterface.addIndex(
      'user_concepts',
      ['user_id', 'active', 'description'],
      {
        name: 'idx_user_concepts_user_active_description',
      }
    )

    await queryInterface.addColumn('payments', 'author_user_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    })
    await queryInterface.addColumn('payments', 'author_name', {
      type: Sequelize.STRING(350),
      allowNull: true,
    })
    await queryInterface.addColumn('payments', 'subtotal_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    })
    await queryInterface.addColumn('payments', 'payment_method', {
      type: Sequelize.ENUM(
        'CASH',
        'DEBIT_CARD',
        'CREDIT_CARD',
        'BANK_TRANSFER',
        'OTHER',
        'MIXED'
      ),
      allowNull: true,
    })
    await queryInterface.addColumn('payments', 'status', {
      type: Sequelize.ENUM('POSTED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'POSTED',
    })
    await queryInterface.addColumn('payments', 'version', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    })
    await queryInterface.addColumn('payments', 'cancelled_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
    await queryInterface.addColumn('payments', 'cancelled_by_user_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    })
    await queryInterface.addColumn('payments', 'cancellation_reason', {
      type: Sequelize.STRING(500),
      allowNull: true,
    })
    await queryInterface.addColumn('payments', 'idempotency_key', {
      type: Sequelize.STRING(36),
      allowNull: true,
    })
    await queryInterface.addColumn('payments', 'request_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    })

    await queryInterface.sequelize.query(
      `UPDATE payments
       INNER JOIN users ON users.id = payments.user_id
       SET payments.author_user_id = users.id,
           payments.author_name = TRIM(CONCAT_WS(' ', users.name, NULLIF(users.middle_name, ''), users.last_name)),
           payments.subtotal_amount = payments.total_amount + payments.discount_amount`
    )
    await queryInterface.sequelize.query(
      `UPDATE payments
       LEFT JOIN (
         SELECT payment_id, COUNT(DISTINCT payment_method) AS method_count,
                MIN(payment_method) AS single_method
         FROM payment_items GROUP BY payment_id
       ) methods ON methods.payment_id = payments.id
       SET payments.payment_method = CASE
         WHEN payments.amount_received = 0 THEN NULL
         WHEN methods.method_count > 1 THEN 'MIXED'
         WHEN methods.single_method = 'DEBIT' THEN 'DEBIT_CARD'
         WHEN methods.single_method = 'CREDIT' THEN 'CREDIT_CARD'
         WHEN methods.single_method = 'TRANSFERENCE' THEN 'BANK_TRANSFER'
         ELSE 'CASH'
       END`
    )
    await queryInterface.changeColumn('payments', 'author_user_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    })
    await queryInterface.changeColumn('payments', 'author_name', {
      type: Sequelize.STRING(350),
      allowNull: false,
    })
    await queryInterface.addIndex('payments', ['user_id', 'idempotency_key'], {
      name: 'uq_payments_user_idempotency',
      unique: true,
    })
    await queryInterface.addIndex(
      'payments',
      ['patient_id', 'status', 'payment_date', 'id'],
      {
        name: 'idx_payments_patient_status_date',
      }
    )
    await addCheck(
      queryInterface,
      'payments',
      totalsCheck,
      '`subtotal_amount` >= 0 AND `discount_amount` <= `subtotal_amount` AND `total_amount` = `subtotal_amount` - `discount_amount` AND ((`amount_received` = 0 AND `payment_method` IS NULL) OR (`amount_received` > 0 AND `payment_method` IS NOT NULL))'
    )

    await queryInterface.addColumn('payment_items', 'description_snapshot', {
      type: Sequelize.STRING(255),
      allowNull: true,
    })
    await queryInterface.addColumn('payment_items', 'unit_price_snapshot', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    })
    await queryInterface.addColumn('payment_items', 'subtotal_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    })
    await queryInterface.sequelize.query(
      `UPDATE payment_items
       INNER JOIN user_concepts ON user_concepts.id = payment_items.user_concept_id
       SET payment_items.description_snapshot = user_concepts.description,
           payment_items.unit_price_snapshot = user_concepts.unit_price,
           payment_items.subtotal_amount = user_concepts.unit_price * payment_items.quantity`
    )
    await queryInterface.changeColumn('payment_items', 'description_snapshot', {
      type: Sequelize.STRING(255),
      allowNull: false,
    })
    await queryInterface.changeColumn('payment_items', 'unit_price_snapshot', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    })
    await queryInterface.changeColumn('payment_items', 'subtotal_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    })
    await addCheck(
      queryInterface,
      'payment_items',
      'chk_payment_items_snapshot_amounts',
      '`unit_price_snapshot` >= 0 AND `subtotal_amount` = `unit_price_snapshot` * `quantity`'
    )

    await queryInterface.createTable(
      'payment_revisions',
      {
        id: idColumn(Sequelize),
        payment_id: referenceColumn(Sequelize, 'payments', 'RESTRICT'),
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        action: {
          type: Sequelize.ENUM('CREATED', 'CORRECTED', 'CANCELLED'),
          allowNull: false,
        },
        changed_by_user_id: referenceColumn(Sequelize, 'users', 'RESTRICT'),
        changed_by_name: { type: Sequelize.STRING(350), allowNull: false },
        snapshot: { type: Sequelize.JSON, allowNull: false },
        change_reason: { type: Sequelize.STRING(500), allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      tableOptions
    )
    await queryInterface.addIndex(
      'payment_revisions',
      ['payment_id', 'version'],
      {
        name: 'uq_payment_revision_version',
        unique: true,
      }
    )
    await queryInterface.sequelize.query(
      `UPDATE payments
       INNER JOIN (
         SELECT id,
                SUM(total_amount - amount_received) OVER (
                  PARTITION BY patient_id ORDER BY payment_date, id
                  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) AS running_balance
         FROM payments WHERE status = 'POSTED'
       ) balances ON balances.id = payments.id
       SET payments.balance_after = balances.running_balance`
    )
    await queryInterface.sequelize.query(
      `UPDATE patients
       LEFT JOIN (
         SELECT patient_id, SUM(total_amount - amount_received) AS current_balance
         FROM payments WHERE status = 'POSTED' GROUP BY patient_id
       ) balances ON balances.patient_id = patients.id
       SET patients.current_balance = COALESCE(balances.current_balance, 0)`
    )
    await queryInterface.sequelize.query(
      `INSERT INTO payment_revisions
       (payment_id, version, action, changed_by_user_id, changed_by_name, snapshot, change_reason, created_at)
       SELECT payments.id, 1, 'CREATED', payments.author_user_id, payments.author_name,
              JSON_OBJECT(
                'id', payments.id,
                'patientId', payments.patient_id,
                'occurredOn', payments.payment_date,
                'subtotal', payments.subtotal_amount,
                'discount', payments.discount_amount,
                'total', payments.total_amount,
                'amountReceived', payments.amount_received,
                'balanceChange', payments.total_amount - payments.amount_received,
                'balanceAfter', payments.balance_after,
                'paymentMethod', payments.payment_method,
                'status', payments.status,
                'version', 1,
                'author', JSON_OBJECT('userId', payments.author_user_id, 'name', payments.author_name),
                'cancelledAt', NULL,
                'cancelledBy', NULL,
                'cancellationReason', NULL,
                'items', COALESCE((
                  SELECT JSON_ARRAYAGG(JSON_OBJECT(
                    'id', payment_items.id,
                    'billingRecordId', payment_items.payment_id,
                    'conceptId', payment_items.user_concept_id,
                    'description', payment_items.description_snapshot,
                    'unitPrice', payment_items.unit_price_snapshot,
                    'quantity', payment_items.quantity,
                    'subtotal', payment_items.subtotal_amount
                  )) FROM payment_items WHERE payment_items.payment_id = payments.id
                ), JSON_ARRAY()),
                'createdAt', payments.created_at,
                'updatedAt', payments.updated_at
              ),
              'Migracion inicial del registro legacy', payments.created_at
       FROM payments`
    )
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payment_revisions')
    await queryInterface.sequelize.query(
      'ALTER TABLE `payment_items` DROP CHECK `chk_payment_items_snapshot_amounts`'
    )
    await queryInterface.removeColumn('payment_items', 'subtotal_amount')
    await queryInterface.removeColumn('payment_items', 'unit_price_snapshot')
    await queryInterface.removeColumn('payment_items', 'description_snapshot')
    await queryInterface.sequelize.query(
      `ALTER TABLE \`payments\` DROP CHECK \`${totalsCheck}\``
    )
    await queryInterface.removeIndex(
      'payments',
      'idx_payments_patient_status_date'
    )
    await queryInterface.removeIndex('payments', 'uq_payments_user_idempotency')
    await queryInterface.removeColumn('payments', 'request_hash')
    await queryInterface.removeColumn('payments', 'idempotency_key')
    await queryInterface.removeColumn('payments', 'cancellation_reason')
    await queryInterface.removeColumn('payments', 'cancelled_by_user_id')
    await queryInterface.removeColumn('payments', 'cancelled_at')
    await queryInterface.removeColumn('payments', 'version')
    await queryInterface.removeColumn('payments', 'status')
    await queryInterface.removeColumn('payments', 'payment_method')
    await queryInterface.removeColumn('payments', 'subtotal_amount')
    await queryInterface.removeColumn('payments', 'author_name')
    await queryInterface.removeColumn('payments', 'author_user_id')
    await queryInterface.removeIndex(
      'user_concepts',
      'idx_user_concepts_user_active_description'
    )
    await queryInterface.removeColumn('user_concepts', 'active')
  },
}
