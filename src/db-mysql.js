const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// MySQL Database Configuration
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root', // Default password
    database: process.env.MYSQL_DATABASE || 'hospital_meals',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
let pool = null;

async function getPool() {
    if (!pool) {
        try {
            // First, create database if it doesn't exist
            const tempConfig = { ...dbConfig };
            delete tempConfig.database;
            const tempConnection = await mysql.createConnection(tempConfig);
            await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
            await tempConnection.end();
            
            // Now create the pool with the database
            pool = mysql.createPool(dbConfig);
            console.log(`✅ Connected to MySQL database: ${dbConfig.database}`);
        } catch (error) {
            console.error('❌ MySQL connection error:', error.message);
            throw error;
        }
    }
    return pool;
}

function nowIso() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// Create database schema
async function createSchema() {
    const db = await getPool();
    
    // Create users table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('admin','nurse','kitchen','delivery','receptionist') NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    
    // Create patients table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS patients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mrn VARCHAR(50) UNIQUE NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            ward VARCHAR(50) NOT NULL,
            bed VARCHAR(20) NOT NULL,
            room_number VARCHAR(20) DEFAULT '',
            dietary_restrictions VARCHAR(255) DEFAULT '',
            allergies VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    
    // Create menu_items table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS menu_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            dietary VARCHAR(100) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    
    // Create orders table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_id INT NOT NULL,
            item_id INT NOT NULL,
            special_instructions VARCHAR(500) DEFAULT '',
            status ENUM('placed','in_kitchen','out_for_delivery','delivered','cancelled') DEFAULT 'placed',
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            created_by INT NOT NULL,
            consumption_status ENUM('unknown','eaten','partial','refused') DEFAULT 'unknown',
            waste_percent INT DEFAULT 0,
            consumption_recorded_at TIMESTAMP NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    
    // Create tiffin_orders table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS tiffin_orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_name VARCHAR(100) NOT NULL,
            ward VARCHAR(50) NOT NULL,
            food_type VARCHAR(50) NOT NULL,
            quantity INT DEFAULT 1,
            order_date DATE NOT NULL,
            status ENUM('pending','confirmed','preparing','ready','delivered','cancelled') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT NOT NULL,
            notes VARCHAR(500) DEFAULT '',
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    
    // Create audit_logs table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            entity VARCHAR(50) NOT NULL,
            entity_id INT NOT NULL,
            action VARCHAR(50) NOT NULL,
            details VARCHAR(500) DEFAULT '',
            user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);
    
    console.log('✅ MySQL database schema created/verified');
}

// Seed data function
async function seedOnce() {
    const db = await getPool();
    
    // Check if users exist
    const [userRows] = await db.execute('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
        const hash = (pwd) => bcrypt.hashSync(pwd, 10);
        await db.execute(
            'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
            ['messowner', hash('mess123'), 'admin', 'Mess Owner']
        );
        await db.execute(
            'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
            ['admin', hash('admin123'), 'admin', 'System Admin']
        );
        await db.execute(
            'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
            ['nurse1', hash('nurse123'), 'nurse', 'Nurse Joy']
        );
        await db.execute(
            'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
            ['kitchen1', hash('kitchen123'), 'kitchen', 'Chef Alex']
        );
        await db.execute(
            'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
            ['delivery1', hash('delivery123'), 'delivery', 'Rider Sam']
        );
        await db.execute(
            'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
            ['receptionist1', hash('reception123'), 'receptionist', 'Receptionist Sarah']
        );
    }

    // Check if patients exist
    const [patientRows] = await db.execute('SELECT COUNT(*) as count FROM patients');
    if (patientRows[0].count === 0) {
        await db.execute(
            'INSERT INTO patients (mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies) VALUES (?,?,?,?,?,?,?)',
            ['MRN-001', 'John Doe', 'Ward A', 'A-12', 'A-12', 'Low Sodium', 'Penicillin']
        );
        await db.execute(
            'INSERT INTO patients (mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies) VALUES (?,?,?,?,?,?,?)',
            ['MRN-002', 'Jane Smith', 'Ward B', 'B-03', 'B-03', 'Diabetic', 'Nuts']
        );
    }

    // Check if menu items exist
    const [menuRows] = await db.execute('SELECT COUNT(*) as count FROM menu_items');
    if (menuRows[0].count === 0) {
        const items = [
            // Breakfast
            { name: 'Idli with Sambar', category: 'Breakfast', dietary: 'Vegetarian' },
            { name: 'Masala Dosa', category: 'Breakfast', dietary: 'Vegetarian' },
            { name: 'Poha', category: 'Breakfast', dietary: 'Vegetarian' },
            { name: 'Upma', category: 'Breakfast', dietary: 'Vegetarian' },
            { name: 'Paratha (Aloo/Gobi)', category: 'Breakfast', dietary: 'Vegetarian' },
            // Lunch
            { name: 'Dal Tadka', category: 'Lunch', dietary: 'Vegetarian' },
            { name: 'Rajma Masala', category: 'Lunch', dietary: 'Vegetarian' },
            { name: 'Chole (Chickpea Curry)', category: 'Lunch', dietary: 'Vegan' },
            { name: 'Paneer Butter Masala', category: 'Lunch', dietary: 'Vegetarian' },
            { name: 'Chicken Curry', category: 'Lunch', dietary: '' },
            { name: 'Veg Biryani', category: 'Lunch', dietary: 'Vegetarian' },
            { name: 'Chicken Biryani', category: 'Lunch', dietary: '' },
            { name: 'Jeera Rice', category: 'Lunch', dietary: 'Vegan, Gluten-Free' },
            { name: 'Roti/Chapati', category: 'Lunch', dietary: 'Vegan' },
            // Dinner
            { name: 'Palak Paneer', category: 'Dinner', dietary: 'Vegetarian' },
            { name: 'Fish Curry', category: 'Dinner', dietary: '' },
            { name: 'Mixed Veg Curry', category: 'Dinner', dietary: 'Vegan' },
            { name: 'Kadhi', category: 'Dinner', dietary: 'Vegetarian' },
            { name: 'Khichdi', category: 'Dinner', dietary: 'Vegetarian, Light' },
            // Snacks/Drinks
            { name: 'Samosa (Baked)', category: 'Snack', dietary: 'Vegetarian' },
            { name: 'Onion Pakora', category: 'Snack', dietary: 'Vegan' },
            { name: 'Masala Chai', category: 'Snack', dietary: '' },
            { name: 'Sweet Lassi', category: 'Snack', dietary: 'Vegetarian' },
            { name: 'Raita (Curd)', category: 'Snack', dietary: 'Vegetarian' }
        ];
        
        for (const item of items) {
            await db.execute(
                'INSERT INTO menu_items (name, category, dietary) VALUES (?,?,?)',
                [item.name, item.category, item.dietary]
            );
        }
    }
}

// Order Management Functions
async function createOrder({ patientId, itemId, specialInstructions, userId }) {
    const db = await getPool();
    const ts = nowIso();
    const [result] = await db.execute(
        'INSERT INTO orders (patient_id, item_id, special_instructions, status, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?)',
        [patientId, itemId, specialInstructions || '', 'placed', ts, ts, userId]
    );
    await logAudit('order', result.insertId, 'created', JSON.stringify({ patientId, itemId, specialInstructions }), userId);
    return result.insertId;
}

async function updateOrderStatus(orderId, status, userId) {
    const db = await getPool();
    const ts = nowIso();
    await db.execute('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [status, ts, orderId]);
    await logAudit('order', orderId, 'status_changed', JSON.stringify({ status }), userId);
}

async function updateOrderConsumption(orderId, consumptionStatus, userId) {
    const db = await getPool();
    const ts = nowIso();
    let waste = 0;
    if (consumptionStatus === 'partial') waste = 50;
    else if (consumptionStatus === 'refused') waste = 100;
    else if (consumptionStatus === 'eaten') waste = 0;
    
    await db.execute(
        'UPDATE orders SET consumption_status = ?, waste_percent = ?, consumption_recorded_at = ?, updated_at = ? WHERE id = ?',
        [consumptionStatus, waste, ts, ts, orderId]
    );
    await logAudit('order', orderId, 'consumption_recorded', JSON.stringify({ consumptionStatus, wastePercent: waste }), userId);
}

async function getOrders(filter = {}) {
    const db = await getPool();
    let query = `SELECT o.*, p.full_name as patient_name, p.ward, p.bed, p.room_number, p.dietary_restrictions, p.allergies, m.name as item_name 
                 FROM orders o
                 JOIN patients p ON p.id = o.patient_id
                 JOIN menu_items m ON m.id = o.item_id`;
    const params = [];
    const where = [];
    
    if (filter?.status) { where.push('o.status = ?'); params.push(filter.status); }
    if (filter?.ward) { where.push('p.ward = ?'); params.push(filter.ward); }
    
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ' ORDER BY o.created_at DESC';
    
    const [rows] = await db.execute(query, params);
    return rows;
}

async function getOrderById(id) {
    const db = await getPool();
    const [rows] = await db.execute(
        `SELECT o.*, p.full_name as patient_name, p.room_number, m.name as item_name 
         FROM orders o
         JOIN patients p ON p.id = o.patient_id
         JOIN menu_items m ON m.id = o.item_id
         WHERE o.id = ?`,
        [id]
    );
    return rows[0];
}

// Tiffin Order Management Functions
async function createTiffinOrder({ patientName, ward, foodType, quantity, orderDate, notes, userId }) {
    const db = await getPool();
    const ts = nowIso();
    const [result] = await db.execute(
        'INSERT INTO tiffin_orders (patient_name, ward, food_type, quantity, order_date, status, created_at, updated_at, created_by, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [patientName, ward, foodType, quantity || 1, orderDate, 'pending', ts, ts, userId, notes || '']
    );
    await logAudit('tiffin_order', result.insertId, 'created', JSON.stringify({ patientName, ward, foodType, quantity }), userId);
    return result.insertId;
}

async function updateTiffinOrder(id, { patientName, ward, foodType, quantity, orderDate, notes, status }) {
    const db = await getPool();
    const ts = nowIso();
    await db.execute(
        'UPDATE tiffin_orders SET patient_name = ?, ward = ?, food_type = ?, quantity = ?, order_date = ?, notes = ?, status = ?, updated_at = ? WHERE id = ?',
        [patientName, ward, foodType, quantity, orderDate, notes || '', status || 'pending', ts, id]
    );
    await logAudit('tiffin_order', id, 'updated', JSON.stringify({ patientName, ward, foodType, quantity }), null);
}

async function deleteTiffinOrder(id) {
    const db = await getPool();
    await db.execute('DELETE FROM tiffin_orders WHERE id = ?', [id]);
    await logAudit('tiffin_order', id, 'deleted', '', null);
}

async function getTiffinOrders(filter = {}) {
    const db = await getPool();
    let query = 'SELECT * FROM tiffin_orders';
    const params = [];
    const where = [];
    
    if (filter.status) { where.push('status = ?'); params.push(filter.status); }
    if (filter.ward) { where.push('ward = ?'); params.push(filter.ward); }
    if (filter.orderDate) { where.push('order_date = ?'); params.push(filter.orderDate); }
    
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ' ORDER BY order_date DESC, created_at DESC';
    
    const [rows] = await db.execute(query, params);
    return rows;
}

async function getTiffinOrderById(id) {
    const db = await getPool();
    const [rows] = await db.execute('SELECT * FROM tiffin_orders WHERE id = ?', [id]);
    return rows[0];
}

async function updateTiffinOrderStatus(id, status, userId) {
    const db = await getPool();
    const ts = nowIso();
    await db.execute('UPDATE tiffin_orders SET status = ?, updated_at = ? WHERE id = ?', [status, ts, id]);
    await logAudit('tiffin_order', id, 'status_changed', JSON.stringify({ status }), userId);
}

// Other Functions
async function getMenu() {
    const db = await getPool();
    const [rows] = await db.execute('SELECT * FROM menu_items ORDER BY category, name');
    return rows;
}

async function getPatients() {
    const db = await getPool();
    const [rows] = await db.execute('SELECT * FROM patients ORDER BY full_name');
    return rows;
}

async function getPatientById(id) {
    const db = await getPool();
    const [rows] = await db.execute('SELECT * FROM patients WHERE id = ?', [id]);
    return rows[0];
}

async function getUserByUsername(username) {
    const db = await getPool();
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
}

async function createPatient({ fullName, roomNumber, dietaryRestrictions, allergies, mrn }) {
    const db = await getPool();
    const mrnValue = mrn && mrn.trim() ? mrn.trim() : `MRN-${Date.now()}`;
    const ward = roomNumber || '';
    const bed = roomNumber || '';
    const [result] = await db.execute(
        'INSERT INTO patients (mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies) VALUES (?,?,?,?,?,?,?)',
        [mrnValue, fullName, ward, bed, roomNumber || '', dietaryRestrictions || '', allergies || '']
    );
    await logAudit('patient', result.insertId, 'created', JSON.stringify({ fullName, roomNumber }), null);
    return result.insertId;
}

async function updatePatient(id, { fullName, roomNumber, dietaryRestrictions, allergies }) {
    const db = await getPool();
    await db.execute(
        'UPDATE patients SET full_name = ?, room_number = ?, dietary_restrictions = ?, allergies = ? WHERE id = ?',
        [fullName, roomNumber || '', dietaryRestrictions || '', allergies || '', id]
    );
    await logAudit('patient', id, 'updated', JSON.stringify({ fullName, roomNumber }), null);
}

async function deletePatient(id) {
    const db = await getPool();
    await db.execute('DELETE FROM patients WHERE id = ?', [id]);
    await logAudit('patient', id, 'deleted', '', null);
}

async function logAudit(entity, entityId, action, details, userId) {
    const db = await getPool();
    await db.execute(
        'INSERT INTO audit_logs (entity, entity_id, action, details, user_id, created_at) VALUES (?,?,?,?,?,?)',
        [entity, entityId, action, details || '', userId || null, nowIso()]
    );
}

// Analytics Functions
async function getDailyMealCounts(days) {
    const db = await getPool();
    const limitDays = Number(days) || 14;
    const [rows] = await db.execute(`
        SELECT DATE(created_at) as day, COUNT(*) as count
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY day
        ORDER BY day ASC
    `, [limitDays - 1]);
    return rows;
}

async function getWeeklyMealCounts(weeks) {
    const db = await getPool();
    const limitWeeks = Number(weeks) || 8;
    const [rows] = await db.execute(`
        SELECT YEARWEEK(created_at) as week, COUNT(*) as count
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
        GROUP BY week
        ORDER BY week ASC
    `, [limitWeeks * 7 - 1]);
    return rows;
}

async function getMostRequestedDishes(limit) {
    const db = await getPool();
    const topN = Number(limit) || 10;
    const [rows] = await db.execute(`
        SELECT m.name as item_name, COUNT(*) as count
        FROM orders o
        JOIN menu_items m ON m.id = o.item_id
        GROUP BY o.item_id
        ORDER BY count DESC, item_name ASC
        LIMIT ${topN}
    `);
    return rows;
}

async function getOrdersByDietaryRestriction() {
    const db = await getPool();
    const [rows] = await db.execute(`
        SELECT
            CASE WHEN TRIM(p.dietary_restrictions) = '' OR p.dietary_restrictions IS NULL THEN 'None' ELSE p.dietary_restrictions END as restriction,
            COUNT(*) as count
        FROM orders o
        JOIN patients p ON p.id = o.patient_id
        GROUP BY restriction
        ORDER BY count DESC, restriction ASC
    `);
    return rows;
}

async function getWasteByWardDaily(days) {
    const db = await getPool();
    const limitDays = Number(days) || 14;
    const [rows] = await db.execute(`
        SELECT 
            DATE(o.consumption_recorded_at) as day,
            p.ward as ward,
            AVG(o.waste_percent) as waste_percent
        FROM orders o
        JOIN patients p ON p.id = o.patient_id
        WHERE o.consumption_recorded_at IS NOT NULL
        AND o.consumption_recorded_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY day, ward
        ORDER BY day ASC, ward ASC
    `, [limitDays - 1]);
    return rows;
}

async function replaceMenuWithIndian() {
    const db = await getPool();
    const items = [
        // Breakfast
        { name: 'Idli with Sambar', category: 'Breakfast', dietary: 'Vegetarian' },
        { name: 'Masala Dosa', category: 'Breakfast', dietary: 'Vegetarian' },
        { name: 'Poha', category: 'Breakfast', dietary: 'Vegetarian' },
        { name: 'Upma', category: 'Breakfast', dietary: 'Vegetarian' },
        { name: 'Paratha (Aloo/Gobi)', category: 'Breakfast', dietary: 'Vegetarian' },
        // Lunch
        { name: 'Dal Tadka', category: 'Lunch', dietary: 'Vegetarian' },
        { name: 'Rajma Masala', category: 'Lunch', dietary: 'Vegetarian' },
        { name: 'Chole (Chickpea Curry)', category: 'Lunch', dietary: 'Vegan' },
        { name: 'Paneer Butter Masala', category: 'Lunch', dietary: 'Vegetarian' },
        { name: 'Chicken Curry', category: 'Lunch', dietary: '' },
        { name: 'Veg Biryani', category: 'Lunch', dietary: 'Vegetarian' },
        { name: 'Chicken Biryani', category: 'Lunch', dietary: '' },
        { name: 'Jeera Rice', category: 'Lunch', dietary: 'Vegan, Gluten-Free' },
        { name: 'Roti/Chapati', category: 'Lunch', dietary: 'Vegan' },
        // Dinner
        { name: 'Palak Paneer', category: 'Dinner', dietary: 'Vegetarian' },
        { name: 'Fish Curry', category: 'Dinner', dietary: '' },
        { name: 'Mixed Veg Curry', category: 'Dinner', dietary: 'Vegan' },
        { name: 'Kadhi', category: 'Dinner', dietary: 'Vegetarian' },
        { name: 'Khichdi', category: 'Dinner', dietary: 'Vegetarian, Light' },
        // Snacks/Drinks
        { name: 'Samosa (Baked)', category: 'Snack', dietary: 'Vegetarian' },
        { name: 'Onion Pakora', category: 'Snack', dietary: 'Vegan' },
        { name: 'Masala Chai', category: 'Snack', dietary: '' },
        { name: 'Sweet Lassi', category: 'Snack', dietary: 'Vegetarian' },
        { name: 'Raita (Curd)', category: 'Snack', dietary: 'Vegetarian' }
    ];
    
    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
        // Delete existing orders and menu items
        await connection.execute('DELETE FROM orders');
        await connection.execute('DELETE FROM menu_items');
        
        // Insert new menu items
        for (const item of items) {
            await connection.execute(
                'INSERT INTO menu_items (name, category, dietary) VALUES (?,?,?)',
                [item.name, item.category, item.dietary]
            );
        }
        
        await connection.commit();
        await logAudit('menu', 0, 'replaced_with_indian', JSON.stringify({ count: items.length }), null);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Initialize database
async function init() {
    await createSchema();
    await seedOnce();
}

module.exports = {
    init,
    getPool,
    createOrder,
    updateOrderStatus,
    updateOrderConsumption,
    getOrders,
    getOrderById,
    getDailyMealCounts,
    getWeeklyMealCounts,
    getMostRequestedDishes,
    getOrdersByDietaryRestriction,
    getWasteByWardDaily,
    getMenu,
    getPatients,
    getPatientById,
    getUserByUsername,
    createPatient,
    updatePatient,
    deletePatient,
    logAudit,
    replaceMenuWithIndian,
    // Tiffin Order Functions
    createTiffinOrder,
    updateTiffinOrder,
    deleteTiffinOrder,
    getTiffinOrders,
    getTiffinOrderById,
    updateTiffinOrderStatus
};
