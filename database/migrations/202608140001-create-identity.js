const {
  idColumn,
  referenceColumn,
  tableOptions,
  timestampColumns,
} = require('../support/schema');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'users',
      {
        id: idColumn(Sequelize),
        name: { type: Sequelize.STRING(100), allowNull: false },
        middle_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: '',
        },
        last_name: { type: Sequelize.STRING(150), allowNull: false },
        date_of_birth: { type: Sequelize.DATE, allowNull: true },
        phone: {
          type: Sequelize.STRING(30),
          allowNull: false,
          defaultValue: '',
        },
        avatar: {
          type: Sequelize.STRING(2048),
          allowNull: false,
          defaultValue: '',
        },
        email: { type: Sequelize.STRING(254), allowNull: false },
        password_hash: { type: Sequelize.STRING(255), allowNull: false },
        status: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        show_finance_stats: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        google_access_token: { type: Sequelize.TEXT, allowNull: true },
        google_refresh_token: { type: Sequelize.TEXT, allowNull: true },
        google_token_expiry_at: { type: Sequelize.DATE, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('users', ['email'], {
      name: 'uq_users_email',
      unique: true,
    });
    await queryInterface.addIndex('users', ['status'], {
      name: 'idx_users_status',
    });

    await queryInterface.createTable(
      'account_verification_tokens',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        token_hash: { type: Sequelize.STRING(64), allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('account_verification_tokens', ['token_hash'], {
      name: 'uq_account_verification_tokens_hash',
      unique: true,
    });
    await queryInterface.addIndex(
      'account_verification_tokens',
      ['user_id', 'expires_at'],
      { name: 'idx_account_verification_tokens_user_expiry' }
    );

    await queryInterface.createTable(
      'password_resets',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        token_hash: { type: Sequelize.STRING(64), allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        used: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('password_resets', ['token_hash'], {
      name: 'uq_password_resets_token_hash',
      unique: true,
    });
    await queryInterface.addIndex('password_resets', ['user_id', 'used', 'expires_at'], {
      name: 'idx_password_resets_user_active',
    });

    await queryInterface.createTable(
      'auth_sessions',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        token_hash: { type: Sequelize.STRING(64), allowNull: false },
        family_id: { type: Sequelize.STRING(36), allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        revoked_at: { type: Sequelize.DATE, allowNull: true },
        user_agent: { type: Sequelize.STRING(512), allowNull: true },
        ip_address: { type: Sequelize.STRING(64), allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('auth_sessions', ['token_hash'], {
      name: 'uq_auth_sessions_token_hash',
      unique: true,
    });
    await queryInterface.addIndex('auth_sessions', ['user_id', 'revoked_at'], {
      name: 'idx_auth_sessions_user_active',
    });
    await queryInterface.addIndex('auth_sessions', ['family_id'], {
      name: 'idx_auth_sessions_family',
    });

    await queryInterface.createTable(
      'oauth_states',
      {
        id: idColumn(Sequelize),
        user_id: referenceColumn(Sequelize, 'users'),
        state_hash: { type: Sequelize.STRING(64), allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        used_at: { type: Sequelize.DATE, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );
    await queryInterface.addIndex('oauth_states', ['state_hash'], {
      name: 'uq_oauth_states_hash',
      unique: true,
    });
    await queryInterface.addIndex('oauth_states', ['user_id', 'expires_at'], {
      name: 'idx_oauth_states_user_expiry',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('oauth_states');
    await queryInterface.dropTable('auth_sessions');
    await queryInterface.dropTable('password_resets');
    await queryInterface.dropTable('account_verification_tokens');
    await queryInterface.dropTable('users');
  },
};
