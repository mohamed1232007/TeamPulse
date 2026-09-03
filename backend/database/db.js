const mysql = require("mysql2");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "mo_database",
    port: Number(process.env.DB_PORT) || 4000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    ssl: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: false,
    },
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Failed to connect to MySQL Database:", err.message);
        console.error("   Host:", process.env.DB_HOST);
        console.error("   User:", process.env.DB_USER);
        console.error("   DB:  ", process.env.DB_NAME);
    } else {
        console.log("✅ Successfully connected to MySQL Database!");
        connection.release();
    }
});

module.exports = pool.promise();
