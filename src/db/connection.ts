import { Sequelize } from "sequelize";

const db = new Sequelize('odontofy', 'root', 'ODOJcRc193494$', {
    host: 'localhost',
    dialect: "mysql",
    port:3306
});

export default db;