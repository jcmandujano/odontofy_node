import { Sequelize } from "sequelize";

const isTest = process.env.NODE_ENV === 'test';
const prefix = isTest ? 'MYSQL_TEST_' : 'MYSQL';
const port = Number(process.env[`${prefix}PORT`] || 3307);
const database =
    process.env[`${prefix}DATABASE`] || (isTest ? 'odontofy_test' : 'odontofy_dev');
const host = process.env[`${prefix}HOST`] || '127.0.0.1';
const user = process.env[`${prefix}USER`] || 'odontofy_local';
const password = process.env[`${prefix}PASSWORD`] || 'local-password';

const db = new Sequelize(database, user, password, {
    host: host,
    dialect: "mysql",
    port,
    timezone: '+00:00',
    logging: false,
});

export default db;
