const path = require('path');
const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const dayjs = require('dayjs');
const expressLayouts = require('express-ejs-layouts');
const { 
	generateToken, 
	verifyToken, 
	jwtAuthMiddleware, 
	enhancedJwtAuthMiddleware,
	jwtRequireRole,
	createRoleMiddleware,
	sessionManagementMiddleware,
	createRateLimitMiddleware,
	refreshToken,
	logAuthEvent,
	blacklistToken
} = require('./auth');

const RealtimeManager = require('./realtime');
const { validatePatient } = require('./validators');

// Use MySQL if configured, otherwise use SQLite
const USE_MYSQL = process.env.DB_TYPE === 'mysql' || process.env.DB_DRIVER === 'mysql';
const dbModule = USE_MYSQL ? require('./db-mysql') : require('./db');

const {
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
	replaceMenuWithIndian,
	logAudit,
	// Tiffin Order Functions
	createTiffinOrder,
	updateTiffinOrder,
	deleteTiffinOrder,
	getTiffinOrders,
	getTiffinOrderById,
	updateTiffinOrderStatus
} = dbModule;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize Real-time Manager
const realtimeManager = new RealtimeManager(server);

const APP_PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-prod';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Enhanced session configuration
app.use(
	session({
		secret: SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: { 
			maxAge: 1000 * 60 * 60 * 8, // 8 hours
			secure: process.env.NODE_ENV === 'production',
			httpOnly: true,
			sameSite: 'strict'
		}
	})
);

// Add session management middleware
app.use(sessionManagementMiddleware);

// Role-based permissions configuration
const rolePermissions = {
	admin: {
		'*': ['*'], // Admin has all permissions
		orders: ['get', 'post', 'put', 'delete'],
		patients: ['get', 'post', 'put', 'delete'],
		menu: ['get', 'post', 'put', 'delete'],
		reports: ['get', 'post'],
		tiffin_orders: ['get', 'post', 'put', 'delete']
	},
	nurse: {
		orders: ['get', 'post'],
		patients: ['get'],
		menu: ['get']
	},
	kitchen: {
		orders: ['get', 'put'],
		menu: ['get']
	},
	delivery: {
		orders: ['get', 'put'],
		menu: ['get']
	},
	receptionist: {
		tiffin_orders: ['get', 'post', 'put', 'delete'],
		patients: ['get'],
		menu: ['get']
	}
};

// Create role middleware
const roleMiddleware = createRoleMiddleware(rolePermissions);

function requireAuth(req, res, next) {
	if (!req.session.user) return res.redirect('/login');
	next();
}

function requireRole(roles) {
	return (req, res, next) => {
		if (!req.session.user || !roles.includes(req.session.user.role)) return res.status(403).send('Forbidden');
		next();
	};
}

app.get('/', (req, res) => {
	if (!req.session.user) return res.redirect('/login');
	res.redirect('/dashboard');
});

app.get('/login', (req, res) => {
	res.render('login', { error: null, errorType: null, user: null });
});

// Rate limiting for authentication endpoints
const authRateLimit = createRateLimitMiddleware(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

app.get('/login', (req, res) => {
	res.render('login', { error: null, errorType: null, user: null });
});

app.post('/login/mess', authRateLimit, async (req, res) => {
	const { username, password } = req.body;
	const user = await getUserByUsername(username);
	
	// Check if user exists and has mess owner role
	if (!user || user.role !== 'admin') {
		logAuthEvent('login_failed', null, { username, reason: 'invalid_role', userType: 'mess' }, req.ip);
		return res.status(401).render('login', { 
			error: 'Invalid credentials or insufficient privileges for mess owner', 
			errorType: 'mess', 
			user: null 
		});
	}
	
	// Add this check to prevent bcrypt error if password_hash is missing
	if (!user.password_hash) {
		logAuthEvent('login_failed', user.id, { username, reason: 'missing_password_hash', userType: 'mess' }, req.ip);
		return res.status(401).render('login', { 
			error: 'Invalid credentials or insufficient privileges for mess owner', 
			errorType: 'mess', 
			user: null 
		});
	}
	
	if (!bcrypt.compareSync(password, user.password_hash)) {
		logAuthEvent('login_failed', user.id, { username, reason: 'invalid_password', userType: 'mess' }, req.ip);
		return res.status(401).render('login', { 
			error: 'Invalid credentials', 
			errorType: 'mess', 
			user: null 
		});
	}
	
	const userSession = { 
		id: user.id, 
		username: user.username, 
		role: user.role, 
		full_name: user.full_name,
		userType: 'mess_owner'
	};
	
	// Generate JWT token
	const token = generateToken(userSession);
	
	req.session.user = userSession;
	req.session.jwtToken = token; // Store JWT in session for web interface
	req.session.timestamp = Date.now(); // Add timestamp for session management
	
	logAuthEvent('login_success', user.id, { username, userType: 'mess' }, req.ip);
	res.redirect('/dashboard');
});

app.post('/login/hospital', authRateLimit, async (req, res) => {
	const { username, password } = req.body;
	const user = await getUserByUsername(username);
	
	// Check if user exists and has hospital role (nurse, kitchen, delivery, receptionist)
	if (!user || !['nurse', 'kitchen', 'delivery', 'receptionist'].includes(user.role)) {
		logAuthEvent('login_failed', null, { username, reason: 'invalid_role', userType: 'hospital' }, req.ip);
		return res.status(401).render('login', { 
			error: 'Invalid credentials or insufficient privileges for hospital access', 
			errorType: 'hospital', 
			user: null 
		});
	}
	
	if (!bcrypt.compareSync(password, user.password_hash)) {
		logAuthEvent('login_failed', user.id, { username, reason: 'invalid_password', userType: 'hospital' }, req.ip);
		return res.status(401).render('login', { 
			error: 'Invalid credentials', 
			errorType: 'hospital', 
			user: null 
		});
	}
	
	const userSession = { 
		id: user.id, 
		username: user.username, 
		role: user.role, 
		full_name: user.full_name,
		userType: user.role === 'receptionist' ? 'receptionist' : 'hospital'
	};
	
	// Generate JWT token
	const token = generateToken(userSession);
	
	req.session.user = userSession;
	req.session.jwtToken = token; // Store JWT in session for web interface
	req.session.timestamp = Date.now(); // Add timestamp for session management
	
	logAuthEvent('login_success', user.id, { username, userType: 'hospital' }, req.ip);
	res.redirect('/dashboard');
});

app.post('/logout', requireAuth, (req, res) => {
	logAudit('auth', req.session.user.id, 'logout', '', req.session.user.id);
	req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', requireAuth, async (req, res) => {
	const role = req.session.user.role;
	
	if (role === 'receptionist') {
		// Show tiffin orders for receptionist
		const filter = {
			status: req.query.status || null,
			ward: req.query.ward || null,
			orderDate: req.query.orderDate || null
		};
		const tiffinOrders = await getTiffinOrders(filter);
		return res.render('receptionist_dashboard', {
			user: req.session.user,
			orders: tiffinOrders,
			dayjs,
			filter: {
				status: filter.status,
				ward: filter.ward,
				orderDate: filter.orderDate
			}
		});
	}
	
	// Regular dashboard for other roles
	const filter = {};
	if (role === 'kitchen') filter.status = 'placed';
	if (role === 'delivery') filter.status = 'out_for_delivery';
	const orders = await getOrders(filter);
	res.render('dashboard', {
		user: req.session.user,
		orders,
		dayjs
	});
});

// Admin: Patient Management
app.get('/admin/patients', requireAuth, requireRole(['admin']), async (req, res) => {
	const patients = await getPatients();
	res.render('patients_admin', { user: req.session.user, patients });
});

app.get('/admin/patients/new', requireAuth, requireRole(['admin']), (req, res) => {
	res.render('patient_form', { 
		user: req.session.user, 
		patient: null, 
		action: 'Create',
		validationFailed: false,
		errors: null,
		formData: null
	});
});

app.post('/admin/patients/new', requireAuth, requireRole(['admin']), async (req, res) => {
	const { full_name, room_number, ward, dietary_restrictions, allergies, mrn } = req.body;
	
	// Server-side validation
	const validation = validatePatient({
		full_name,
		room_number,
		ward: ward || room_number, // Use room_number as fallback for ward
		dietary_restrictions,
		allergies,
		mrn
	});

	if (!validation.isValid) {
		// Return error response - re-render form with errors
		const patients = await getPatients();
		return res.status(400).render('patient_form', {
			user: req.session.user,
			patient: null,
			action: 'Create',
			errors: validation.errors,
			formData: req.body,
			validationFailed: true
		});
	}

	try {
		await createPatient({
			fullName: full_name.trim(),
			roomNumber: room_number.trim(),
			dietaryRestrictions: dietary_restrictions ? dietary_restrictions.trim() : '',
			allergies: allergies ? allergies.trim() : '',
			mrn: mrn ? mrn.trim() : null
		});
		res.redirect('/admin/patients');
	} catch (error) {
		console.error('Error creating patient:', error);
		return res.status(500).render('patient_form', {
			user: req.session.user,
			patient: null,
			action: 'Create',
			errors: { general: ['Failed to create patient. Please try again.'] },
			formData: req.body,
			validationFailed: true
		});
	}
});

app.get('/admin/patients/:id/edit', requireAuth, requireRole(['admin']), async (req, res) => {
	const patient = await getPatientById(Number(req.params.id));
	if (!patient) return res.status(404).send('Not found');
	res.render('patient_form', { 
		user: req.session.user, 
		patient, 
		action: 'Update',
		validationFailed: false,
		errors: null,
		formData: null
	});
});

app.post('/admin/patients/:id/edit', requireAuth, requireRole(['admin']), async (req, res) => {
	const { full_name, room_number, ward, dietary_restrictions, allergies, mrn } = req.body;
	const patientId = Number(req.params.id);

	// Server-side validation
	const validation = validatePatient({
		full_name,
		room_number,
		ward: ward || room_number, // Use room_number as fallback for ward
		dietary_restrictions,
		allergies,
		mrn
	});

	if (!validation.isValid) {
		// Get patient data and re-render form with errors
		const patient = await getPatientById(patientId);
		return res.status(400).render('patient_form', {
			user: req.session.user,
			patient,
			action: 'Update',
			errors: validation.errors,
			formData: req.body,
			validationFailed: true
		});
	}

	try {
		await updatePatient(patientId, {
			fullName: full_name.trim(),
			roomNumber: room_number.trim(),
			dietaryRestrictions: dietary_restrictions ? dietary_restrictions.trim() : '',
			allergies: allergies ? allergies.trim() : ''
		});
		res.redirect('/admin/patients');
	} catch (error) {
		console.error('Error updating patient:', error);
		const patient = await getPatientById(patientId);
		return res.status(500).render('patient_form', {
			user: req.session.user,
			patient,
			action: 'Update',
			errors: { general: ['Failed to update patient. Please try again.'] },
			formData: req.body,
			validationFailed: true
		});
	}
});

app.post('/admin/patients/:id/delete', requireAuth, requireRole(['admin']), async (req, res) => {
	await deletePatient(Number(req.params.id));
	res.redirect('/admin/patients');
});

app.get('/orders', requireAuth, async (req, res) => {
	const orders = await getOrders({ status: req.query.status || null, ward: req.query.ward || null });
	const patients = await getPatients();
	const menu = await getMenu();
	res.render('orders', { user: req.session.user, orders, dayjs, patients, menu });
});

app.post('/orders', requireAuth, requireRole(['nurse','admin']), async (req, res) => {
	const { patient_id, item_id, special_instructions } = req.body;
	const orderId = await createOrder({
		patientId: Number(patient_id),
		itemId: Number(item_id),
		specialInstructions: special_instructions,
		userId: req.session.user.id
	});
	const order = await getOrderById(orderId);
	
	// Broadcast real-time order creation
	realtimeManager.broadcastOrderCreated(order);
	
	// Emit to specific rooms
	realtimeManager.io.to(realtimeManager.rooms.kitchen).emit('new-order-kitchen', order);
	
	res.redirect('/orders');
});

app.post('/orders/:id/status', requireAuth, requireRole(['kitchen','delivery','admin']), async (req, res) => {
	const { id } = req.params;
	const { status } = req.body;
	await updateOrderStatus(Number(id), status, req.session.user.id);
	const order = await getOrderById(Number(id));
	
	// Broadcast real-time status update
	realtimeManager.io.to(realtimeManager.rooms.orders).emit('order-status-updated', {
		orderId: Number(id),
		status,
		order,
		updatedBy: req.session.user,
		timestamp: new Date().toISOString()
	});
	
	// Emit to specific role rooms based on status
	if (status === 'in_kitchen') {
		realtimeManager.io.to(realtimeManager.rooms.kitchen).emit('order-assigned-kitchen', order);
	} else if (status === 'out_for_delivery') {
		realtimeManager.io.to(realtimeManager.rooms.delivery).emit('order-ready-delivery', order);
	} else if (status === 'delivered') {
		realtimeManager.io.to(realtimeManager.rooms.nurse).emit('order-delivered', order);
	}
	
	res.redirect('/orders');
});

// Delivery marks consumption (eaten/partial/refused)
app.post('/orders/:id/consumption', requireAuth, requireRole(['delivery','admin']), async (req, res) => {
	const { id } = req.params;
	const { consumption_status } = req.body;
	const allowed = ['eaten','partial','refused'];
	const status = allowed.includes(consumption_status) ? consumption_status : 'unknown';
	await updateOrderConsumption(Number(id), status, req.session.user.id);
	const order = await getOrderById(Number(id));
	io.emit('orders:updated', { type: 'consumption', orderId: Number(id), consumption_status: status, order });
	res.redirect('/orders');
});

app.get('/menu', requireAuth, async (req, res) => {
	const menu = await getMenu();
	res.render('menu', { user: req.session.user, menu });
});

// Reports & Analytics (Admin)
app.get('/admin/reports', requireAuth, requireRole(['admin']), async (req, res) => {
	const days = Number(req.query.days) || 14;
	const weeks = Number(req.query.weeks) || 8;
	const daily = await getDailyMealCounts(days);
	const weekly = await getWeeklyMealCounts(weeks);
	const topDishes = await getMostRequestedDishes(10);
	const byDiet = await getOrdersByDietaryRestriction();
	const wasteByWardDaily = await getWasteByWardDaily(days);
	res.render('reports', { user: req.session.user, daily, weekly, topDishes, byDiet, wasteByWardDaily });
});

// CSV export
app.get('/admin/reports/export.csv', requireAuth, requireRole(['admin']), async (req, res) => {
	const daily = await getDailyMealCounts(30);
	const weekly = await getWeeklyMealCounts(12);
	const topDishes = await getMostRequestedDishes(25);
	const byDiet = await getOrdersByDietaryRestriction();
	const waste = await getWasteByWardDaily(30);

	let csv = 'Section,Label,Count\n';
	for (const r of daily) csv += `Daily,${r.day},${r.count}\n`;
	for (const r of weekly) csv += `Weekly,${r.week},${r.count}\n`;
	for (const r of topDishes) csv += `TopDish,${r.item_name},${r.count}\n`;
	for (const r of byDiet) csv += `Dietary,${r.restriction},${r.count}\n`;
	for (const r of waste) csv += `Waste,${r.day} | ${r.ward},${Number(r.waste_percent).toFixed(1)}%\n`;

	res.setHeader('Content-Type', 'text/csv');
	res.setHeader('Content-Disposition', 'attachment; filename="reports.csv"');
	res.send(csv);
});

// PDF export
app.get('/admin/reports/export.pdf', requireAuth, requireRole(['admin']), async (req, res) => {
	const PDFDocument = require('pdfkit');
	const doc = new PDFDocument({ size: 'A4', margin: 40 });
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename="reports.pdf"');
	doc.pipe(res);

	doc.fontSize(18).text('Hospital Meals - Reports', { align: 'center' });
	doc.moveDown();

	const daily = await getDailyMealCounts(14);
	const weekly = await getWeeklyMealCounts(8);
	const topDishes = await getMostRequestedDishes(10);
	const byDiet = await getOrdersByDietaryRestriction();
	const waste = await getWasteByWardDaily(14);

	function table(items, headers) {
		doc.moveDown(0.5);
		doc.fontSize(12).text(headers.join(' | '));
		doc.moveDown(0.25);
		doc.fontSize(10);
		for (const row of items) {
			doc.text(headers.map(h => String(row[h])).join(' | '));
		}
	}

	doc.fontSize(14).text('Daily Meal Counts');
	table(daily.map(r => ({ day: r.day, count: r.count })), ['day','count']);

	doc.moveDown();
	doc.fontSize(14).text('Weekly Meal Counts');
	table(weekly.map(r => ({ week: r.week, count: r.count })), ['week','count']);

	doc.moveDown();
	doc.fontSize(14).text('Most Requested Dishes');
	table(topDishes.map(r => ({ item: r.item_name, count: r.count })), ['item','count']);

	doc.moveDown();
	doc.fontSize(14).text('Orders by Dietary Restriction');
	table(byDiet.map(r => ({ restriction: r.restriction, count: r.count })), ['restriction','count']);

	doc.moveDown();
	doc.fontSize(14).text('Waste by Ward (Daily % wasted)');
	table(waste.map(r => ({ day: r.day, ward: r.ward, waste: `${Number(r.waste_percent).toFixed(1)}%` })), ['day','ward','waste']);

	doc.end();
});

// Excel export
app.get('/admin/reports/export.xlsx', requireAuth, requireRole(['admin']), async (req, res) => {
	const ExcelJS = require('exceljs');
	const workbook = new ExcelJS.Workbook();

	function sheetFrom(name, headers, rows){
		const ws = workbook.addWorksheet(name);
		ws.columns = headers.map(h => ({ header: h.label, key: h.key, width: Math.max(h.label.length + 2, 16) }));
		for(const r of rows){ ws.addRow(r); }
		return ws;
	}

	const daily = getDailyMealCounts(30);
	const weekly = getWeeklyMealCounts(12);
	const topDishes = getMostRequestedDishes(25);
	const byDiet = getOrdersByDietaryRestriction();
	const waste = getWasteByWardDaily(30);

	sheetFrom('Daily', [{label:'Day',key:'day'},{label:'Count',key:'count'}], daily);
	sheetFrom('Weekly', [{label:'Week',key:'week'},{label:'Count',key:'count'}], weekly);
	sheetFrom('Top Dishes', [{label:'Item',key:'item_name'},{label:'Count',key:'count'}], topDishes);
	sheetFrom('Dietary', [{label:'Restriction',key:'restriction'},{label:'Count',key:'count'}], byDiet);
	sheetFrom('Waste', [{label:'Day',key:'day'},{label:'Ward',key:'ward'},{label:'Waste %',key:'waste_percent'}], waste.map(r => ({ day: r.day, ward: r.ward, waste_percent: Number(r.waste_percent).toFixed(1) })));

	res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	res.setHeader('Content-Disposition', 'attachment; filename="reports.xlsx"');
	await workbook.xlsx.write(res);
	res.end();
});

app.post('/admin/menu/indian', requireAuth, requireRole(['admin']), async (req, res) => {
	await replaceMenuWithIndian();
	io.emit('orders:updated', { type: 'menu_reloaded' });
	res.redirect('/menu');
});

// Tiffin Order Management - Receptionist Dashboard
app.get('/receptionist/tiffin-orders', requireAuth, requireRole(['receptionist', 'admin']), async (req, res) => {
	const filter = {
		status: req.query.status || null,
		ward: req.query.ward || null,
		orderDate: req.query.orderDate || null
	};
	const orders = await getTiffinOrders(filter);
	res.render('tiffin_orders', { 
		user: req.session.user, 
		orders, 
		dayjs,
		filter: {
			status: filter.status,
			ward: filter.ward,
			orderDate: filter.orderDate
		}
	});
});

app.get('/receptionist/tiffin-orders/new', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	res.render('tiffin_order_form', { user: req.session.user, order: null, action: 'Create' });
});

app.post('/receptionist/tiffin-orders/new', requireAuth, requireRole(['receptionist', 'admin']), async (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes } = req.body;
	await createTiffinOrder({
		patientName: patient_name,
		ward: ward,
		foodType: food_type,
		quantity: Number(quantity) || 1,
		orderDate: order_date,
		notes: notes,
		userId: req.session.user.id
	});
	res.redirect('/receptionist/tiffin-orders');
});

app.get('/receptionist/tiffin-orders/:id/edit', requireAuth, requireRole(['receptionist', 'admin']), async (req, res) => {
	const order = await getTiffinOrderById(Number(req.params.id));
	if (!order) return res.status(404).send('Order not found');
	res.render('tiffin_order_form', { user: req.session.user, order, action: 'Update' });
});

app.post('/receptionist/tiffin-orders/:id/edit', requireAuth, requireRole(['receptionist', 'admin']), async (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes, status } = req.body;
	await updateTiffinOrder(Number(req.params.id), {
		patientName: patient_name,
		ward: ward,
		foodType: food_type,
		quantity: Number(quantity) || 1,
		orderDate: order_date,
		notes: notes,
		status: status
	});
	res.redirect('/receptionist/tiffin-orders');
});

app.post('/receptionist/tiffin-orders/:id/delete', requireAuth, requireRole(['receptionist', 'admin']), async (req, res) => {
	await deleteTiffinOrder(Number(req.params.id));
	res.redirect('/receptionist/tiffin-orders');
});

app.post('/receptionist/tiffin-orders/:id/status', requireAuth, requireRole(['receptionist', 'admin']), async (req, res) => {
	const { id } = req.params;
	const { status } = req.body;
	await updateTiffinOrderStatus(Number(id), status, req.session.user.id);
	res.redirect('/receptionist/tiffin-orders');
});

// REST API endpoints for tiffin orders
app.get('/api/tiffin-orders', requireAuth, async (req, res) => {
	const filter = {
		status: req.query.status || null,
		ward: req.query.ward || null,
		orderDate: req.query.orderDate || null
	};
	const orders = await getTiffinOrders(filter);
	res.json(orders);
});

app.post('/api/tiffin-orders', requireAuth, requireRole(['receptionist', 'admin']), async (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes } = req.body;
	const orderId = await createTiffinOrder({
		patientName: patient_name,
		ward: ward,
		foodType: food_type,
		quantity: Number(quantity) || 1,
		orderDate: order_date,
		notes: notes,
		userId: req.session.user.id
	});
	const order = await getTiffinOrderById(orderId);
	res.json({ success: true, order });
});

app.put('/api/tiffin-orders/:id', requireAuth, requireRole(['receptionist', 'admin']), async (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes, status } = req.body;
	await updateTiffinOrder(Number(req.params.id), {
		patientName: patient_name,
		ward: ward,
		foodType: food_type,
		quantity: Number(quantity) || 1,
		orderDate: order_date,
		notes: notes,
		status: status
	});
	const order = await getTiffinOrderById(Number(req.params.id));
	res.json({ success: true, order });
});

app.delete('/api/tiffin-orders/:id', requireAuth, requireRole(['receptionist', 'admin']), async (req, res) => {
	await deleteTiffinOrder(Number(req.params.id));
	res.json({ success: true });
});

// JWT Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
	const { username, password, userType } = req.body;
	const user = await getUserByUsername(username);
	
	if (!user) {
		return res.status(401).json({ 
			error: 'Invalid credentials',
			code: 'INVALID_CREDENTIALS'
		});
	}
	
	// Check password first
	if (!bcrypt.compareSync(password, user.password_hash)) {
		return res.status(401).json({ 
			error: 'Invalid credentials',
			code: 'INVALID_CREDENTIALS'
		});
	}
	
	// Check user type and role - allow admin role for both mess and hospital
	if (userType === 'mess' && user.role !== 'admin') {
		return res.status(401).json({ 
			error: 'Insufficient privileges for mess owner access',
			code: 'INSUFFICIENT_PRIVILEGES'
		});
	}
	
	if (userType === 'hospital' && user.role === 'admin') {
		return res.status(401).json({ 
			error: 'Admin access restricted to mess owner portal',
			code: 'INSUFFICIENT_PRIVILEGES'
		});
	}
	
	const userSession = { 
		id: user.id, 
		username: user.username, 
		role: user.role, 
		full_name: user.full_name,
		userType: userType === 'mess' ? 'mess_owner' : (user.role === 'receptionist' ? 'receptionist' : 'hospital')
	};
	
	const token = generateToken(userSession);
	
	logAudit('auth', user.id, 'api_login', userSession.userType, user.id);
	
	res.json({
		success: true,
		token,
		user: userSession,
		expiresIn: '24h'
	});
});

app.post('/api/auth/refresh', jwtAuthMiddleware, (req, res) => {
	try {
		const authHeader = req.headers.authorization;
		const token = authHeader.substring(7); // Remove 'Bearer ' prefix
		
		const result = refreshToken(token);
		
		res.json({
			success: true,
			token: result.token,
			user: result.user
		});
	} catch (error) {
		res.status(401).json({
			error: 'Token refresh failed',
			code: 'REFRESH_FAILED'
		});
	}
});

app.get('/api/auth/verify', jwtAuthMiddleware, (req, res) => {
	res.json({
		success: true,
		user: req.user,
		valid: true
	});
});

app.post('/api/auth/logout', jwtAuthMiddleware, (req, res) => {
	logAudit('auth', req.user.id, 'api_logout', '', req.user.id);
	res.json({
		success: true,
		message: 'Logged out successfully'
	});
});

// Update existing API endpoints to use JWT authentication
app.get('/api/tiffin-orders', jwtAuthMiddleware, async (req, res) => {
	const filter = {
		status: req.query.status || null,
		ward: req.query.ward || null,
		orderDate: req.query.orderDate || null
	};
	const orders = await getTiffinOrders(filter);
	res.json(orders);
});

app.post('/api/tiffin-orders', jwtAuthMiddleware, jwtRequireRole(['receptionist', 'admin']), async (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes } = req.body;
	const orderId = await createTiffinOrder({
		patientName: patient_name,
		ward: ward,
		foodType: food_type,
		quantity: Number(quantity) || 1,
		orderDate: order_date,
		notes: notes,
		userId: req.user.id
	});
	const order = await getTiffinOrderById(orderId);
	res.json({ success: true, order });
});

app.put('/api/tiffin-orders/:id', jwtAuthMiddleware, jwtRequireRole(['receptionist', 'admin']), async (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes, status } = req.body;
	await updateTiffinOrder(Number(req.params.id), {
		patientName: patient_name,
		ward: ward,
		foodType: food_type,
		quantity: Number(quantity) || 1,
		orderDate: order_date,
		notes: notes,
		status: status
	});
	const order = getTiffinOrderById(Number(req.params.id));
	res.json({ success: true, order });
});

app.delete('/api/tiffin-orders/:id', jwtAuthMiddleware, jwtRequireRole(['receptionist', 'admin']), async (req, res) => {
	await deleteTiffinOrder(Number(req.params.id));
	res.json({ success: true });
});

app.get('/patients', requireAuth, async (req, res) => {
	const patients = await getPatients();
	res.json(patients);
});

// Legacy WebSocket connection handler (kept for compatibility)
io.on('connection', () => {});

// Enhanced Authentication API Endpoints
app.post('/api/auth/logout', enhancedJwtAuthMiddleware, (req, res) => {
	// Blacklist the token
	blacklistToken(req.token);
	
	logAuthEvent('api_logout', req.user.id, { username: req.user.username }, req.ip);
	res.json({
		success: true,
		message: 'Logged out successfully'
	});
});

// Token refresh endpoint
app.post('/api/auth/refresh', enhancedJwtAuthMiddleware, (req, res) => {
	try {
		const result = refreshToken(req.token);
		
		// Blacklist old token
		blacklistToken(req.token);
		
		res.json({
			success: true,
			token: result.token,
			user: result.user,
			expiresIn: '24h'
		});
	} catch (error) {
		res.status(401).json({
			error: 'Token refresh failed',
			code: 'REFRESH_FAILED'
		});
	}
});

// Real-time API endpoints
app.get('/api/realtime/status', enhancedJwtAuthMiddleware, (req, res) => {
	const connectedUsers = realtimeManager.getConnectedUsers();
	const userCounts = realtimeManager.getConnectedUsersCount();
	
	res.json({
		success: true,
		connectedUsers: connectedUsers.length,
		userCounts,
		rooms: Object.keys(realtimeManager.rooms)
	});
});

app.post('/api/realtime/broadcast', enhancedJwtAuthMiddleware, jwtRequireRole(['admin']), (req, res) => {
	const { message, type, targetRoles } = req.body;
	
	if (!message) {
		return res.status(400).json({
			error: 'Message is required',
			code: 'MISSING_MESSAGE'
		});
	}
	
	realtimeManager.broadcastSystemNotification(message, type || 'info', targetRoles || []);
	
	res.json({
		success: true,
		message: 'Notification broadcasted successfully'
	});
});

// Emergency notification endpoint
app.post('/api/realtime/emergency', enhancedJwtAuthMiddleware, (req, res) => {
	const { type, message, priority, orderId } = req.body;
	
	if (!message) {
		return res.status(400).json({
			error: 'Message is required',
			code: 'MISSING_MESSAGE'
		});
	}
	
	const notification = {
		id: Date.now(),
		type: type || 'emergency',
		message,
		priority: priority || 'high',
		orderId,
		sender: req.user,
		timestamp: new Date().toISOString()
	};
	
	// Broadcast emergency notification
	realtimeManager.io.emit('emergency-notification', notification);
	realtimeManager.io.to(realtimeManager.rooms.admin).emit('admin-alert', notification);
	
	logAuthEvent('emergency_notification', req.user.id, notification, req.ip);
	
	res.json({
		success: true,
		notification,
		message: 'Emergency notification sent successfully'
	});
});

// Device management endpoints
app.post('/api/auth/device/register', enhancedJwtAuthMiddleware, (req, res) => {
	const { generateDeviceToken } = require('./auth');
	const deviceInfo = {
		userAgent: req.headers['user-agent'],
		ip: req.ip
	};
	
	const deviceToken = generateDeviceToken(req.user.id, deviceInfo);
	
	res.json({
		success: true,
		deviceToken,
		expiresIn: '30d'
	});
});

// Session management endpoints
app.get('/api/auth/session/status', requireAuth, (req, res) => {
	const sessionAge = Date.now() - (req.session.timestamp || 0);
	const maxAge = 8 * 60 * 60 * 1000; // 8 hours
	const remainingTime = maxAge - sessionAge;
	
	res.json({
		success: true,
		session: {
			user: req.session.user,
			age: sessionAge,
			remainingTime,
			isValid: remainingTime > 0
		}
	});
});

app.post('/api/auth/session/refresh', requireAuth, (req, res) => {
	req.session.timestamp = Date.now();
	res.json({
		success: true,
		message: 'Session refreshed successfully'
	});
});

// Initialize database if using MySQL
(async () => {
	if (USE_MYSQL && dbModule.init) {
		try {
			await dbModule.init();
			console.log('✅ MySQL database initialized');
		} catch (error) {
			console.error('❌ MySQL initialization failed:', error.message);
			process.exit(1);
		}
	}
	
	server.listen(APP_PORT, () => {
		console.log(`🚀 Server running on http://localhost:${APP_PORT}`);
		console.log(`📊 Database: ${USE_MYSQL ? 'MySQL (hospital_meals)' : 'SQLite (hospital_meals.sqlite)'}`);
		console.log(`🔐 Enhanced JWT Authentication enabled`);
		console.log(`⚡ Real-time WebSocket system active`);
		console.log(`🍱 Receptionist Dashboard available`);
		console.log(`🔒 Rate limiting and session management enabled`);
		console.log(`📡 Real-time notifications and emergency alerts ready`);
		console.log(`\n🔑 Login Credentials:`);
		console.log(`   Admin: messowner / mess123`);
		console.log(`   Admin: admin / admin123`);
		console.log(`   Nurse: nurse1 / nurse123`);
		console.log(`   Kitchen: kitchen1 / kitchen123`);
		console.log(`   Delivery: delivery1 / delivery123`);
		console.log(`   Receptionist: receptionist1 / reception123`);
		console.log(`\n📡 Real-time Features:`);
		console.log(`   - Role-based WebSocket rooms`);
		console.log(`   - Live order status updates`);
		console.log(`   - Emergency notifications`);
		console.log(`   - Delivery location tracking`);
		console.log(`   - System-wide broadcasts`);
	});
})();
