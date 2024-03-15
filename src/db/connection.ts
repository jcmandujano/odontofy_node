import { Sequelize } from "sequelize";

const db = new Sequelize('odontofy', 'root', 'JcRc193494$=', {
    host: 'localhost',
    dialect: "mysql"
});

export default db;