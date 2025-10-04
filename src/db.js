const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbFile = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(__dirname, '..', 'hospital_meals.sqlite');
const db = new Database(dbFile);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL CHECK(role IN ('admin','nurse','kitchen','delivery','receptionist')),
	full_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	mrn TEXT UNIQUE NOT NULL,
	full_name TEXT NOT NULL,
	ward TEXT NOT NULL,
	bed TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	category TEXT NOT NULL,
	dietary TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	patient_id INTEGER NOT NULL,
	item_id INTEGER NOT NULL,
	special_instructions TEXT DEFAULT '',
	status TEXT NOT NULL CHECK(status IN ('placed','in_kitchen','out_for_delivery','delivered','cancelled')) DEFAULT 'placed',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	created_by INTEGER NOT NULL,
	consumption_status TEXT NOT NULL DEFAULT 'unknown' CHECK(consumption_status IN ('unknown','eaten','partial','refused')),
	waste_percent INTEGER NOT NULL DEFAULT 0,
	consumption_recorded_at TEXT,
	FOREIGN KEY(patient_id) REFERENCES patients(id),
	FOREIGN KEY(item_id) REFERENCES menu_items(id),
	FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	entity TEXT NOT NULL,
	entity_id INTEGER NOT NULL,
	action TEXT NOT NULL,
	details TEXT DEFAULT '',
	user_id INTEGER,
	created_at TEXT NOT NULL,
	FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tiffin_orders (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	patient_name TEXT NOT NULL,
	ward TEXT NOT NULL,
	food_type TEXT NOT NULL,
	quantity INTEGER NOT NULL DEFAULT 1,
	order_date TEXT NOT NULL,
	status TEXT NOT NULL CHECK(status IN ('pending','confirmed','preparing','ready','delivered','cancelled')) DEFAULT 'pending',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	created_by INTEGER NOT NULL,
	notes TEXT DEFAULT '',
	FOREIGN KEY(created_by) REFERENCES users(id)
);
`);

function nowIso() {
	return new Date().toISOString();
}

function addColumnIfMissing(table, column, ddl) {
	const cols = db.prepare(`PRAGMA table_info(${table})`).all();
	if (!cols.find(c => c.name === column)) {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
	}
}

// Safe migration for new patient fields
addColumnIfMissing('patients', 'room_number', `TEXT NOT NULL DEFAULT ''`);
addColumnIfMissing('patients', 'dietary_restrictions', `TEXT DEFAULT ''`);
addColumnIfMissing('patients', 'allergies', `TEXT DEFAULT ''`);

// Safe migration for waste tracking fields on orders
addColumnIfMissing('orders', 'consumption_status', `TEXT NOT NULL DEFAULT 'unknown'`);
addColumnIfMissing('orders', 'waste_percent', `INTEGER NOT NULL DEFAULT 0`);
addColumnIfMissing('orders', 'consumption_recorded_at', `TEXT`);

// Migration: ensure users.role CHECK includes 'receptionist'
function ensureUsersRoleAllowsReceptionist() {
    try {
        const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
        const createSql = row && row.sql ? row.sql : '';
        if (createSql.includes("'receptionist'")) {
            return; // already compatible
        }

        // Perform table migration to widen CHECK constraint
        db.pragma('foreign_keys = OFF');
        const tx = db.transaction(() => {
            db.exec(`CREATE TABLE IF NOT EXISTS users_migrating (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin','nurse','kitchen','delivery','receptionist')),
                full_name TEXT NOT NULL
            );`);

            // Copy data
            db.exec(`INSERT OR IGNORE INTO users_migrating (id, username, password_hash, role, full_name)
                     SELECT id, username, password_hash, role, full_name FROM users;`);

            db.exec('DROP TABLE users');
            db.exec('ALTER TABLE users_migrating RENAME TO users');
        });
        tx();
    } finally {
        db.pragma('foreign_keys = ON');
    }
}

ensureUsersRoleAllowsReceptionist();

function seedOnce() {
	const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
	if (userCount === 0) {
		const hash = (pwd) => bcrypt.hashSync(pwd, 10);
		const insertUser = db.prepare('INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,?,?)');
		insertUser.run('messowner', hash('mess123'), 'admin', 'Mess Owner');
		insertUser.run('admin', hash('admin123'), 'admin', 'System Admin');
		insertUser.run('nurse1', hash('nurse123'), 'nurse', 'Nurse Joy');
		insertUser.run('kitchen1', hash('kitchen123'), 'kitchen', 'Chef Alex');
		insertUser.run('delivery1', hash('delivery123'), 'delivery', 'Rider Sam');
		insertUser.run('receptionist1', hash('reception123'), 'receptionist', 'Receptionist Sarah');
	}

	const patientCount = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
	if (patientCount === 0) {
		const insertPatient = db.prepare('INSERT INTO patients (mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies) VALUES (?,?,?,?,?,?,?)');
		insertPatient.run('MRN-001', 'John Doe', 'Ward A', 'A-12', 'A-12', 'Low Sodium', 'Penicillin');
		insertPatient.run('MRN-002', 'Jane Smith', 'Ward B', 'B-03', 'B-03', 'Diabetic', 'Nuts');
	}

	const menuCount = db.prepare('SELECT COUNT(*) as c FROM menu_items').get().c;
	if (menuCount === 0) {
		const insertItem = db.prepare('INSERT INTO menu_items (name, category, dietary) VALUES (?,?,?)');
		insertItem.run('Oatmeal', 'Breakfast', 'Vegetarian');
		insertItem.run('Grilled Chicken', 'Lunch', 'High Protein');
		insertItem.run('Vegetable Soup', 'Dinner', 'Vegan');
		insertItem.run('Fruit Salad', 'Snack', 'Gluten-Free');
	}

	// Insert sample orders if none exist
	const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
	if (orderCount === 0) {
		// Get sample user, patient, and menu item IDs
		const user = db.prepare('SELECT id FROM users WHERE username = ?').get('nurse1');
		const patient1 = db.prepare('SELECT id FROM patients WHERE mrn = ?').get('MRN-001');
		const patient2 = db.prepare('SELECT id FROM patients WHERE mrn = ?').get('MRN-002');
		const oatmeal = db.prepare('SELECT id FROM menu_items WHERE name = ?').get('Oatmeal');
		const chicken = db.prepare('SELECT id FROM menu_items WHERE name = ?').get('Grilled Chicken');
		const soup = db.prepare('SELECT id FROM menu_items WHERE name = ?').get('Vegetable Soup');
		const salad = db.prepare('SELECT id FROM menu_items WHERE name = ?').get('Fruit Salad');

		if (user && patient1 && patient2 && oatmeal && chicken && soup && salad) {
			const insertOrder = db.prepare('INSERT INTO orders (patient_id, item_id, special_instructions, status, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?)');
			const now = nowIso();
			insertOrder.run(patient1.id, oatmeal.id, 'No sugar', 'placed', now, now, user.id);
			insertOrder.run(patient1.id, chicken.id, '', 'in_kitchen', now, now, user.id);
			insertOrder.run(patient2.id, soup.id, 'Extra hot', 'out_for_delivery', now, now, user.id);
			insertOrder.run(patient2.id, salad.id, '', 'delivered', now, now, user.id);
		} else {
			console.warn('Sample order data not inserted: missing user, patient, or menu item IDs');
		}
	}
}

function logAudit(entity, entityId, action, details, userId) {
	db.prepare(
		'INSERT INTO audit_logs (entity, entity_id, action, details, user_id, created_at) VALUES (?,?,?,?,?,?)'
	).run(entity, entityId, action, details || '', userId || null, nowIso());
}

function createOrder({ patientId, itemId, specialInstructions, userId }) {
	const ts = nowIso();
	const stmt = db.prepare(
		'INSERT INTO orders (patient_id, item_id, special_instructions, status, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?)'
	);
	const info = stmt.run(patientId, itemId, specialInstructions || '', 'placed', ts, ts, userId);
	logAudit('order', info.lastInsertRowid, 'created', JSON.stringify({ patientId, itemId, specialInstructions }), userId);
	return info.lastInsertRowid;
}

function updateOrderStatus(orderId, status, userId) {
	const ts = nowIso();
	db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, ts, orderId);
	logAudit('order', orderId, 'status_changed', JSON.stringify({ status }), userId);
}

function updateOrderConsumption(orderId, consumptionStatus, userId) {
	const ts = nowIso();
	let waste = 0;
	if (consumptionStatus === 'partial') waste = 50;
	else if (consumptionStatus === 'refused') waste = 100;
	else if (consumptionStatus === 'eaten') waste = 0;
	db.prepare('UPDATE orders SET consumption_status = ?, waste_percent = ?, consumption_recorded_at = ?, updated_at = ? WHERE id = ?')
		.run(consumptionStatus, waste, ts, ts, orderId);
	logAudit('order', orderId, 'consumption_recorded', JSON.stringify({ consumptionStatus, wastePercent: waste }), userId);
}

function getOrders(filter) {
	let query = `SELECT o.*, p.full_name as patient_name, p.ward, p.bed, p.room_number, p.dietary_restrictions, p.allergies, m.name as item_name FROM orders o
	JOIN patients p ON p.id = o.patient_id
	JOIN menu_items m ON m.id = o.item_id`;
	const params = [];
	const where = [];
	if (filter?.status) { where.push('o.status = ?'); params.push(filter.status); }
	if (filter?.ward) { where.push('p.ward = ?'); params.push(filter.ward); }
	if (where.length) query += ' WHERE ' + where.join(' AND ');
	query += ' ORDER BY o.created_at DESC';
	return db.prepare(query).all(...params);
}

function getOrderById(id) {
	return db.prepare(`SELECT o.*, p.full_name as patient_name, p.room_number, m.name as item_name FROM orders o
	JOIN patients p ON p.id = o.patient_id
	JOIN menu_items m ON m.id = o.item_id
	WHERE o.id = ?`).get(id);
}

function getDailyMealCounts(days) {
	const limitDays = Number(days) || 14;
	return db.prepare(`
		SELECT strftime('%Y-%m-%d', datetime(created_at)) as day, COUNT(*) as count
		FROM orders
		WHERE datetime(created_at) >= datetime('now', '-' || (? - 1) || ' days', 'start of day')
		GROUP BY day
		ORDER BY day ASC
	`).all(limitDays);
}

function getWeeklyMealCounts(weeks) {
	const limitWeeks = Number(weeks) || 8;
	return db.prepare(`
		SELECT strftime('%Y-%W', datetime(created_at)) as week, COUNT(*) as count
		FROM orders
		WHERE datetime(created_at) >= datetime('now', '-' || (? * 7 - 1) || ' days', 'start of day')
		GROUP BY week
		ORDER BY week ASC
	`).all(limitWeeks);
}

function getMostRequestedDishes(limit) {
	const topN = Number(limit) || 10;
	return db.prepare(`
		SELECT m.name as item_name, COUNT(*) as count
		FROM orders o
		JOIN menu_items m ON m.id = o.item_id
		GROUP BY o.item_id
		ORDER BY count DESC, item_name ASC
		LIMIT ?
	`).all(topN);
}

function getOrdersByDietaryRestriction() {
	return db.prepare(`
		SELECT
			CASE WHEN TRIM(p.dietary_restrictions) = '' THEN 'None' ELSE p.dietary_restrictions END as restriction,
			COUNT(*) as count
		FROM orders o
		JOIN patients p ON p.id = o.patient_id
		GROUP BY restriction
		ORDER BY count DESC, restriction ASC
	`).all();
}

function getWasteByWardDaily(days) {
	const limitDays = Number(days) || 14;
	return db.prepare(`
		SELECT 
			strftime('%Y-%m-%d', datetime(o.consumption_recorded_at)) as day,
			p.ward as ward,
			AVG(o.waste_percent) as waste_percent
		FROM orders o
		JOIN patients p ON p.id = o.patient_id
		WHERE o.consumption_recorded_at IS NOT NULL
		AND datetime(o.consumption_recorded_at) >= datetime('now', '-' || (? - 1) || ' days', 'start of day')
		GROUP BY day, ward
		ORDER BY day ASC, ward ASC
	`).all(limitDays);
}

function getMenu() {
	return db.prepare('SELECT * FROM menu_items ORDER BY category, name').all();
}

function getPatients() {
	return db.prepare('SELECT * FROM patients ORDER BY full_name').all();
}

function getPatientById(id) {
	return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
}

function getUserByUsername(username) {
	return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function createPatient({ fullName, roomNumber, dietaryRestrictions, allergies, mrn }) {
	const mrnValue = mrn && mrn.trim() ? mrn.trim() : `MRN-${Date.now()}`;
	const ward = roomNumber || '';
	const bed = roomNumber || '';
	const stmt = db.prepare('INSERT INTO patients (mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies) VALUES (?,?,?,?,?,?,?)');
	const info = stmt.run(mrnValue, fullName, ward, bed, roomNumber || '', dietaryRestrictions || '', allergies || '');
	logAudit('patient', info.lastInsertRowid, 'created', JSON.stringify({ fullName, roomNumber }), null);
	return info.lastInsertRowid;
}

function updatePatient(id, { fullName, roomNumber, dietaryRestrictions, allergies }) {
	const stmt = db.prepare('UPDATE patients SET full_name = ?, room_number = ?, dietary_restrictions = ?, allergies = ? WHERE id = ?');
	stmt.run(fullName, roomNumber || '', dietaryRestrictions || '', allergies || '', id);
	logAudit('patient', id, 'updated', JSON.stringify({ fullName, roomNumber }), null);
}

function deletePatient(id) {
	db.prepare('DELETE FROM patients WHERE id = ?').run(id);
	logAudit('patient', id, 'deleted', '', null);
}

function replaceMenuWithIndian() {
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
	const insert = db.prepare('INSERT INTO menu_items (name, category, dietary) VALUES (?,?,?)');
	const tx = db.transaction(() => {
		// First, delete all existing orders to avoid foreign key constraint issues
		db.exec('DELETE FROM orders');
		// Then delete menu items
		db.exec('DELETE FROM menu_items');
		// Insert new menu items
		for (const it of items) insert.run(it.name, it.category, it.dietary);
	});
	tx();
}

function replaceMenuWithHospital() {
	const items = [
		{ name: 'Oatmeal', category: 'Breakfast', dietary: 'Vegetarian' },
		{ name: 'Scrambled Eggs', category: 'Breakfast', dietary: 'High Protein' },
		{ name: 'Whole Wheat Toast', category: 'Breakfast', dietary: 'Vegetarian' },
		{ name: 'Chicken Soup', category: 'Lunch', dietary: 'High Protein' },
		{ name: 'Steamed Vegetables', category: 'Lunch', dietary: 'Vegan' },
		{ name: 'Grilled Fish', category: 'Lunch', dietary: '' },
		{ name: 'Rice Porridge', category: 'Dinner', dietary: 'Vegetarian, Light' },
		{ name: 'Baked Potato', category: 'Dinner', dietary: 'Vegetarian' },
		{ name: 'Fruit Salad', category: 'Snack', dietary: 'Gluten-Free' },
		{ name: 'Yogurt', category: 'Snack', dietary: 'Vegetarian' }
	];
	const insert = db.prepare('INSERT INTO menu_items (name, category, dietary) VALUES (?,?,?)');
	const tx = db.transaction(() => {
		db.exec('DELETE FROM orders');
		db.exec('DELETE FROM menu_items');
		for (const it of items) insert.run(it.name, it.category, it.dietary);
	});
	tx();
	logAudit('menu', 0, 'replaced_with_indian', JSON.stringify({ count: items.length }), null);
}

// Tiffin Order Management Functions
function createTiffinOrder({ patientName, ward, foodType, quantity, orderDate, notes, userId }) {
	const ts = nowIso();
	const stmt = db.prepare(
		'INSERT INTO tiffin_orders (patient_name, ward, food_type, quantity, order_date, status, created_at, updated_at, created_by, notes) VALUES (?,?,?,?,?,?,?,?,?,?)'
	);
	const info = stmt.run(patientName, ward, foodType, quantity || 1, orderDate, 'pending', ts, ts, userId, notes || '');
	logAudit('tiffin_order', info.lastInsertRowid, 'created', JSON.stringify({ patientName, ward, foodType, quantity }), userId);
	return info.lastInsertRowid;
}

function updateTiffinOrder(id, { patientName, ward, foodType, quantity, orderDate, notes, status }) {
	const ts = nowIso();
	const stmt = db.prepare(
		'UPDATE tiffin_orders SET patient_name = ?, ward = ?, food_type = ?, quantity = ?, order_date = ?, notes = ?, status = ?, updated_at = ? WHERE id = ?'
	);
	stmt.run(patientName, ward, foodType, quantity, orderDate, notes || '', status || 'pending', ts, id);
	logAudit('tiffin_order', id, 'updated', JSON.stringify({ patientName, ward, foodType, quantity }), null);
}

function deleteTiffinOrder(id) {
	db.prepare('DELETE FROM tiffin_orders WHERE id = ?').run(id);
	logAudit('tiffin_order', id, 'deleted', '', null);
}

function getTiffinOrders(filter = {}) {
	let query = 'SELECT * FROM tiffin_orders';
	const params = [];
	const where = [];
	
	if (filter.status) { 
		where.push('status = ?'); 
		params.push(filter.status); 
	}
	if (filter.ward) { 
		where.push('ward = ?'); 
		params.push(filter.ward); 
	}
	if (filter.orderDate) { 
		where.push('order_date = ?'); 
		params.push(filter.orderDate); 
	}
	
	if (where.length) query += ' WHERE ' + where.join(' AND ');
	query += ' ORDER BY order_date DESC, created_at DESC';
	
	return db.prepare(query).all(...params);
}

function getTiffinOrderById(id) {
	return db.prepare('SELECT * FROM tiffin_orders WHERE id = ?').get(id);
}

function updateTiffinOrderStatus(id, status, userId) {
	const ts = nowIso();
	db.prepare('UPDATE tiffin_orders SET status = ?, updated_at = ? WHERE id = ?').run(status, ts, id);
	logAudit('tiffin_order', id, 'status_changed', JSON.stringify({ status }), userId);
}

seedOnce();

module.exports = {
	db,
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
