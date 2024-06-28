import { Sequelize } from "sequelize";

const db = new Sequelize('odontofy', 'root', 'JcRc1934$', {
    host: 'localhost',
    dialect: "mysql",
    port:3307
});

export default db;