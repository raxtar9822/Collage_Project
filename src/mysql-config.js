const mysql = require('mysql2/promise');

// MySQL Database Configuration
const mysqlConfig = {
    host: process.env.MYSQL_HOST || '93',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'hospital_meals',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

// Create connection pool
let pool = null;

async function createConnection() {
    try {
        // First, connect without database to create it if it doesn't exist
        const tempConfig = { ...mysqlConfig };
        delete tempConfig.database;
        
        const tempConnection = await mysql.createConnection(tempConfig);
        
        // Create database if it doesn't exist
        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${mysqlConfig.database}\``);
        await tempConnection.end();
        
        // Now create the pool with the database
        pool = mysql.createPool(mysqlConfig);
        
        console.log(`✅ Connected to MySQL database: ${mysqlConfig.database}`);
        return pool;
    } catch (error) {
        console.error('❌ MySQL connection error:', error.message);
        throw error;
    }
}

async function getConnection() {
    if (!pool) {
        await createConnection();
    }
    return pool;
}

async function testConnection() {
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ MySQL connection test successful');
        return true;
    } catch (error) {
        console.error('❌ MySQL connection test failed:', error.message);
        return false;
    }
}

async function closeConnection() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ MySQL connection closed');
    }
}

module.exports = {
    mysqlConfig,
    createConnection,
    getConnection,
    testConnection,
    closeConnection
};





