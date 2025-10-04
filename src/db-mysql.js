const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

let pool;

// Initialize MySQL connection pool
async function initializeMySQL() {
	try {
		pool = mysql.createPool({
			host: process.env.MYSQL_HOST || 'localhost',
			port: process.env.MYSQL_PORT || 3306,
			user: process.env.MYSQL_USER || 'root',
			password: process.env.MYSQL_PASSWORD || '',
			database: process.env.MYSQL_DATABASE || 'hospital_meals',
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0
		});

		const connection = await pool.getConnection();
		console.log(`✅ Connected to MySQL database: ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE}`);
		connection.release();
		
		await createTables();
		return pool;
	} catch (error) {
		console.error('❌ Failed to connect to MySQL:', error.message);
		throw error;
	}
}

// Create tables if they don't exist
async function createTables() {
	const connection = await pool.getConnection();
	try {
		await connection.query(`
			CREATE TABLE IF NOT EXISTS users (
				id INT AUTO_INCREMENT PRIMARY KEY,
				username VARCHAR(255) UNIQUE NOT NULL,
				password_hash VARCHAR(255) NOT NULL,
				role ENUM('admin','nurse','kitchen','delivery','receptionist') NOT NULL,
				full_name VARCHAR(255) NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		await connection.query(`
			CREATE TABLE IF NOT EXISTS patients (
				id INT AUTO_INCREMENT PRIMARY KEY,
				mrn VARCHAR(255) UNIQUE NOT NULL,
				full_name VARCHAR(255) NOT NULL,
				hospital_name VARCHAR(255) DEFAULT 'General Hospital',
				ward VARCHAR(255) NOT NULL,
				bed VARCHAR(255) NOT NULL,
				room_number VARCHAR(255),
				dietary_restrictions TEXT,
				allergies TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		await connection.query(`
			CREATE TABLE IF NOT EXISTS menu_items (
				id INT AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				category VARCHAR(100) NOT NULL,
				dietary TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		await connection.query(`
			CREATE TABLE IF NOT EXISTS orders (
				id INT AUTO_INCREMENT PRIMARY KEY,
				patient_id INT NOT NULL,
				item_id INT NOT NULL,
				special_instructions TEXT,
				status ENUM('placed','in_kitchen','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'placed',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				created_by INT,
				consumption_status ENUM('unknown','eaten','partial','refused') NOT NULL DEFAULT 'unknown',
				waste_percent INT DEFAULT 0,
				consumption_recorded_at TIMESTAMP,
				FOREIGN KEY(patient_id) REFERENCES patients(id),
				FOREIGN KEY(item_id) REFERENCES menu_items(id),
				FOREIGN KEY(created_by) REFERENCES users(id),
				INDEX idx_patient_id (patient_id),
				INDEX idx_item_id (item_id),
				INDEX idx_status (status),
				INDEX idx_created_at (created_at)
			)
		`);

		await connection.query(`
			CREATE TABLE IF NOT EXISTS audit_logs (
				id INT AUTO_INCREMENT PRIMARY KEY,
				entity VARCHAR(100) NOT NULL,
				entity_id INT NOT NULL,
				action VARCHAR(100) NOT NULL,
				details TEXT,
				user_id INT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY(user_id) REFERENCES users(id),
				INDEX idx_entity (entity, entity_id)
			)
		`);

		await connection.query(`
			CREATE TABLE IF NOT EXISTS tiffin_orders (
				id INT AUTO_INCREMENT PRIMARY KEY,
				patient_name VARCHAR(255) NOT NULL,
				ward VARCHAR(255) NOT NULL,
				food_type VARCHAR(255) NOT NULL,
				quantity INT DEFAULT 1,
				order_date DATE NOT NULL,
				status ENUM('pending','confirmed','preparing','ready','delivered','cancelled') NOT NULL DEFAULT 'pending',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				created_by INT,
				notes TEXT,
				FOREIGN KEY(created_by) REFERENCES users(id),
				INDEX idx_order_date (order_date),
				INDEX idx_status (status)
			)
		`);

		console.log('✅ All MySQL tables created/verified');
	} catch (error) {
		console.error('Error creating tables:', error.message);
	} finally {
		connection.release();
	}
}

// Get connection
async function getConnection() {
	return await pool.getConnection();
}

// Database functions for MySQL
async function seedOnce() {
	const connection = await pool.getConnection();
	try {
		// Check if users exist
		const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
		console.log(`[Seed] User count: ${users[0].count}`);
		
		// Always recreate users to ensure correct password hashes
		if (users[0].count > 0) {
			console.log('[Seed] Clearing existing users...');
			await connection.query('DELETE FROM users');
		}
		
		console.log('[Seed] Creating default users...');
		const hash = (pwd) => bcrypt.hashSync(pwd, 10);
		
		await connection.query(
			'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
			['messowner', hash('mess123'), 'admin', 'Mess Owner']
		);
		console.log('[Seed] ✅ Created messowner');
		
		await connection.query(
			'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
			['admin', hash('admin123'), 'admin', 'System Admin']
		);
		console.log('[Seed] ✅ Created admin');
		
		await connection.query(
			'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
			['nurse1', hash('nurse123'), 'nurse', 'Nurse Joy']
		);
		console.log('[Seed] ✅ Created nurse1');
		
		await connection.query(
			'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
			['kitchen1', hash('kitchen123'), 'kitchen', 'Chef Alex']
		);
		console.log('[Seed] ✅ Created kitchen1');
		
		await connection.query(
			'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
			['delivery1', hash('delivery123'), 'delivery', 'Rider Sam']
		);
		console.log('[Seed] ✅ Created delivery1');
		
		await connection.query(
			'INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)',
			['receptionist1', hash('reception123'), 'receptionist', 'Receptionist Sarah']
		);
		console.log('[Seed] ✅ Created receptionist1');

		// Check if patients exist
		const [patients] = await connection.query('SELECT COUNT(*) as count FROM patients');
		if (patients[0].count === 0) {
			await connection.query(
				'INSERT INTO patients (mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies) VALUES (?,?,?,?,?,?,?)',
				['MRN-001', 'John Doe', 'Ward A', 'A-12', 'A-12', 'Low Sodium', 'Penicillin']
			);
			await connection.query(
				'INSERT INTO patients (mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies) VALUES (?,?,?,?,?,?,?)',
				['MRN-002', 'Jane Smith', 'Ward B', 'B-03', 'B-03', 'Diabetic', 'Nuts']
			);
		}

		// Check if menu items exist
		const [menu] = await connection.query('SELECT COUNT(*) as count FROM menu_items');
		if (menu[0].count === 0) {
			const items = [
				['Oatmeal', 'Breakfast', 'Vegetarian'],
				['Scrambled Eggs', 'Breakfast', 'High Protein'],
				['Whole Wheat Toast', 'Breakfast', 'Vegetarian'],
				['Chicken Soup', 'Lunch', 'High Protein'],
				['Steamed Vegetables', 'Lunch', 'Vegan'],
				['Grilled Fish', 'Lunch', ''],
				['Rice Porridge', 'Dinner', 'Vegetarian, Light'],
				['Baked Potato', 'Dinner', 'Vegetarian'],
				['Fruit Salad', 'Snack', 'Gluten-Free'],
				['Yogurt', 'Snack', 'Vegetarian']
			];
			for (const item of items) {
				await connection.query(
					'INSERT INTO menu_items (name, category, dietary) VALUES (?,?,?)',
					item
				);
			}
		}
	} finally {
		connection.release();
	}
}

async function createOrder({ patientId, itemId, specialInstructions, userId }) {
	const connection = await pool.getConnection();
	try {
		const result = await connection.query(
			'INSERT INTO orders (patient_id, item_id, special_instructions, status, created_at, updated_at, created_by) VALUES (?,?,?,?,NOW(),NOW(),?)',
			[patientId, itemId, specialInstructions || '', 'placed', userId]
		);
		await logAudit('order', result[0].insertId, 'created', JSON.stringify({ patientId, itemId }), userId);
		return result[0].insertId;
	} finally {
		connection.release();
	}
}

async function updateOrderStatus(orderId, status, userId) {
	const connection = await pool.getConnection();
	try {
		await connection.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
		await logAudit('order', orderId, 'status_changed', JSON.stringify({ status }), userId);
	} finally {
		connection.release();
	}
}

async function getOrders(filter = {}) {
	const connection = await pool.getConnection();
	try {
		let query = `
			SELECT 
				o.id, o.patient_id, o.item_id, o.special_instructions,
				o.status, o.created_at, o.consumption_status, o.waste_percent,
				p.full_name as patient_name, p.room_number, p.allergies, p.dietary_restrictions,
				m.name as item_name, m.category
			FROM orders o
			JOIN patients p ON o.patient_id = p.id
			JOIN menu_items m ON o.item_id = m.id
			WHERE 1=1
		`;
		const params = [];
		
		if (filter.status) {
			query += ` AND o.status = ?`;
			params.push(filter.status);
		}
		if (filter.ward) {
			query += ` AND p.room_number LIKE ?`;
			params.push(`${filter.ward}%`);
		}
		
		query += ` ORDER BY o.created_at DESC`;
		
		const [rows] = await connection.query(query, params);
		return rows;
	} finally {
		connection.release();
	}
}

async function getMenu() {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query('SELECT id, name, category, dietary FROM menu_items ORDER BY category, name');
		return rows;
	} finally {
		connection.release();
	}
}

async function getPatients() {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query('SELECT id, mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies FROM patients ORDER BY full_name');
		return rows;
	} finally {
		connection.release();
	}
}

async function getPatientById(id) {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query('SELECT * FROM patients WHERE id = ?', [id]);
		return rows[0] || null;
	} finally {
		connection.release();
	}
}

async function getUserByUsername(username) {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query('SELECT id, username, password_hash, role, full_name FROM users WHERE username = ?', [username]);
		console.log(`[DB] getUserByUsername("${username}"): found=${rows.length > 0}, role=${rows[0]?.role}`);
		return rows[0] || null;
	} finally {
		connection.release();
	}
}

async function createPatient({ fullName, roomNumber, dietaryRestrictions, allergies, mrn, hospitalName }) {
	const connection = await pool.getConnection();
	try {
		const result = await connection.query(
			'INSERT INTO patients (mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies) VALUES (?,?,?,?,?,?,?)',
			[mrn || `MRN-${Date.now()}`, fullName, roomNumber || '', roomNumber || '', roomNumber, dietaryRestrictions, allergies]
		);
		return result[0].insertId;
	} finally {
		connection.release();
	}
}

async function logAudit(entity, entityId, action, details, userId) {
	const connection = await pool.getConnection();
	try {
		await connection.query(
			'INSERT INTO audit_logs (entity, entity_id, action, details, user_id) VALUES (?,?,?,?,?)',
			[entity, entityId || 0, action, details || '', userId || null]
		);
	} finally {
		connection.release();
	}
}

async function replaceMenuWithHospital() {
	const connection = await pool.getConnection();
	try {
		await connection.query('DELETE FROM menu_items');
		const items = [
			['Oatmeal', 'Breakfast', 'Vegetarian'],
			['Scrambled Eggs', 'Breakfast', 'High Protein'],
			['Whole Wheat Toast', 'Breakfast', 'Vegetarian'],
			['Chicken Soup', 'Lunch', 'High Protein'],
			['Steamed Vegetables', 'Lunch', 'Vegan'],
			['Grilled Fish', 'Lunch', ''],
			['Rice Porridge', 'Dinner', 'Vegetarian, Light'],
			['Baked Potato', 'Dinner', 'Vegetarian'],
			['Fruit Salad', 'Snack', 'Gluten-Free'],
			['Yogurt', 'Snack', 'Vegetarian']
		];
		for (const item of items) {
			await connection.query(
				'INSERT INTO menu_items (name, category, dietary) VALUES (?,?,?)',
				item
			);
		}
		await logAudit('menu', 0, 'replaced_with_hospital', 'Switched to hospital menu');
	} finally {
		connection.release();
	}
}

async function getDailyMealCounts() {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query(`
			SELECT DATE(created_at) as date, COUNT(*) as count
			FROM orders
			WHERE DATE(created_at) = CURDATE()
			GROUP BY DATE(created_at)
		`);
		return rows;
	} finally {
		connection.release();
	}
}

async function getWeeklyMealCounts() {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query(`
			SELECT 
				YEARWEEK(created_at) as week,
				DATE(DATE_SUB(created_at, INTERVAL DAYOFWEEK(created_at)-1 DAY)) as week_start,
				COUNT(*) as count
			FROM orders
			WHERE created_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
			GROUP BY YEARWEEK(created_at), DATE(DATE_SUB(created_at, INTERVAL DAYOFWEEK(created_at)-1 DAY))
			ORDER BY week DESC
		`);
		return rows;
	} finally {
		connection.release();
	}
}

async function getMostRequestedDishes() {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query(`
			SELECT m.name, COUNT(*) as count
			FROM orders o
			JOIN menu_items m ON o.item_id = m.id
			GROUP BY m.id, m.name
			ORDER BY count DESC
			LIMIT 10
		`);
		return rows;
	} finally {
		connection.release();
	}
}

async function getOrdersByDietaryRestriction() {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query(`
			SELECT 
				p.dietary_restrictions,
				COUNT(*) as count
			FROM orders o
			JOIN patients p ON o.patient_id = p.id
			WHERE p.dietary_restrictions IS NOT NULL AND p.dietary_restrictions != ''
			GROUP BY p.dietary_restrictions
			ORDER BY count DESC
		`);
		return rows;
	} finally {
		connection.release();
	}
}

async function getWasteByWardDaily() {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query(`
			SELECT 
				DATE(o.created_at) as date,
				p.ward,
				AVG(o.waste_percent) as avg_waste
			FROM orders o
			JOIN patients p ON o.patient_id = p.id
			WHERE o.waste_percent > 0
			GROUP BY DATE(o.created_at), p.ward
			ORDER BY date DESC, p.ward
		`);
		return rows;
	} finally {
		connection.release();
	}
}

async function getTiffinOrders() {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query(`
			SELECT * FROM tiffin_orders 
			ORDER BY order_date DESC, created_at DESC
		`);
		return rows;
	} finally {
		connection.release();
	}
}

async function createTiffinOrder(data) {
	const connection = await pool.getConnection();
	try {
		const result = await connection.query(
			'INSERT INTO tiffin_orders (patient_name, ward, food_type, quantity, order_date, status, created_by, notes) VALUES (?,?,?,?,?,?,?,?)',
			[data.patientName, data.ward, data.foodType, data.quantity || 1, data.orderDate, 'pending', data.userId, data.notes]
		);
		return result[0].insertId;
	} finally {
		connection.release();
	}
}

async function updateOrderConsumption(orderId, consumptionStatus, wastePercent, userId) {
	const connection = await pool.getConnection();
	try {
		await connection.query(
			'UPDATE orders SET consumption_status = ?, waste_percent = ?, consumption_recorded_at = NOW() WHERE id = ?',
			[consumptionStatus, wastePercent || 0, orderId]
		);
		await logAudit('order', orderId, 'consumption_updated', JSON.stringify({ consumptionStatus, wastePercent }), userId);
	} finally {
		connection.release();
	}
}

async function getOrderById(id) {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query(`
			SELECT 
				o.*, p.full_name as patient_name, p.room_number, p.allergies, p.dietary_restrictions,
				m.name as item_name, m.category
			FROM orders o
			JOIN patients p ON o.patient_id = p.id
			JOIN menu_items m ON o.item_id = m.id
			WHERE o.id = ?
		`, [id]);
		return rows[0] || null;
	} finally {
		connection.release();
	}
}

async function updatePatient(id, data) {
	const connection = await pool.getConnection();
	try {
		await connection.query(
			'UPDATE patients SET full_name = ?, hospital_name = ?, ward = ?, bed = ?, room_number = ?, dietary_restrictions = ?, allergies = ? WHERE id = ?',
			[data.fullName, data.hospitalName, data.ward, data.bed, data.roomNumber, data.dietaryRestrictions, data.allergies, id]
		);
	} finally {
		connection.release();
	}
}

async function deletePatient(id) {
	const connection = await pool.getConnection();
	try {
		await connection.query('DELETE FROM patients WHERE id = ?', [id]);
	} finally {
		connection.release();
	}
}

async function updateTiffinOrder(id, data) {
	const connection = await pool.getConnection();
	try {
		await connection.query(
			'UPDATE tiffin_orders SET patient_name = ?, ward = ?, food_type = ?, quantity = ?, status = ?, notes = ? WHERE id = ?',
			[data.patientName, data.ward, data.foodType, data.quantity, data.status, data.notes, id]
		);
	} finally {
		connection.release();
	}
}

async function deleteTiffinOrder(id) {
	const connection = await pool.getConnection();
	try {
		await connection.query('DELETE FROM tiffin_orders WHERE id = ?', [id]);
	} finally {
		connection.release();
	}
}

async function getTiffinOrderById(id) {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query('SELECT * FROM tiffin_orders WHERE id = ?', [id]);
		return rows[0] || null;
	} finally {
		connection.release();
	}
}

async function updateTiffinOrderStatus(id, status) {
	const connection = await pool.getConnection();
	try {
		await connection.query('UPDATE tiffin_orders SET status = ? WHERE id = ?', [status, id]);
	} finally {
		connection.release();
	}
}

// Initialization wrapper for server.js compatibility
async function init() {
	await initializeMySQL();
	await seedOnce();
}

module.exports = {
	init,
	initializeMySQL,
	createTables,
	seedOnce,
	getConnection,
	createOrder,
	updateOrderStatus,
	updateOrderConsumption,
	getOrders,
	getOrderById,
	getMenu,
	getPatients,
	getPatientById,
	getUserByUsername,
	createPatient,
	updatePatient,
	deletePatient,
	logAudit,
	replaceMenuWithHospital,
	getDailyMealCounts,
	getWeeklyMealCounts,
	getMostRequestedDishes,
	getOrdersByDietaryRestriction,
	getWasteByWardDaily,
	getTiffinOrders,
	getTiffinOrderById,
	createTiffinOrder,
	updateTiffinOrder,
	deleteTiffinOrder,
	updateTiffinOrderStatus
};