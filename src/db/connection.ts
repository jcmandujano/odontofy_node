import { Sequelize } from "sequelize";
//ENV VARIABLES
const port = process.env.MYSQLPORT || '';
const database = process.env.MYSQLDATABASE || '';
const host = process.env.MYSQLHOST || '';
const user = process.env.MYSQLUSER || '';
const password = process.env.MYSQLPASSWORD;

const db = new Sequelize(database, user, password, {
    host: host,
    dialect: "mysql",
    port: parseInt(port),
});

export default db;