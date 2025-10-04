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
	jwtRequireRole,
	refreshToken 
} = require('./auth');

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
} = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const APP_PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-prod';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

app.use(
	session({
		secret: SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: { maxAge: 1000 * 60 * 60 * 8 }
	})
);

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

app.post('/login/mess', (req, res) => {
	const { username, password } = req.body;
	const user = getUserByUsername(username);
	
	// Check if user exists and has mess owner role
	if (!user || user.role !== 'admin') {
		return res.status(401).render('login', { 
			error: 'Invalid credentials or insufficient privileges for mess owner', 
			errorType: 'mess', 
			user: null 
		});
	}
	
	if (!bcrypt.compareSync(password, user.password_hash)) {
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
	
	logAudit('auth', user.id, 'login', 'mess_owner', user.id);
	res.redirect('/dashboard');
});

app.post('/login/hospital', (req, res) => {
	const { username, password } = req.body;
	const user = getUserByUsername(username);
	
	// Check if user exists and has hospital role (nurse, kitchen, delivery, receptionist)
	if (!user || !['nurse', 'kitchen', 'delivery', 'receptionist'].includes(user.role)) {
		return res.status(401).render('login', { 
			error: 'Invalid credentials or insufficient privileges for hospital access', 
			errorType: 'hospital', 
			user: null 
		});
	}
	
	if (!bcrypt.compareSync(password, user.password_hash)) {
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
	
	logAudit('auth', user.id, 'login', user.role === 'receptionist' ? 'receptionist' : 'hospital', user.id);
	res.redirect('/dashboard');
});

app.post('/logout', requireAuth, (req, res) => {
	logAudit('auth', req.session.user.id, 'logout', '', req.session.user.id);
	req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', requireAuth, (req, res) => {
	const role = req.session.user.role;
	
	if (role === 'receptionist') {
		// Show tiffin orders for receptionist
		const filter = {
			status: req.query.status || null,
			ward: req.query.ward || null,
			orderDate: req.query.orderDate || null
		};
		const tiffinOrders = getTiffinOrders(filter);
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
	const orders = getOrders(filter);
	res.render('dashboard', {
		user: req.session.user,
		orders,
		dayjs
	});
});

// Admin: Patient Management
app.get('/admin/patients', requireAuth, requireRole(['admin']), (req, res) => {
	const patients = getPatients();
	res.render('patients_admin', { user: req.session.user, patients });
});

app.get('/admin/patients/new', requireAuth, requireRole(['admin']), (req, res) => {
	res.render('patient_form', { user: req.session.user, patient: null, action: 'Create' });
});

app.post('/admin/patients/new', requireAuth, requireRole(['admin']), (req, res) => {
	const { full_name, room_number, dietary_restrictions, allergies } = req.body;
	createPatient({ fullName: full_name, roomNumber: room_number, dietaryRestrictions: dietary_restrictions, allergies });
	res.redirect('/admin/patients');
});

app.get('/admin/patients/:id/edit', requireAuth, requireRole(['admin']), (req, res) => {
	const patient = getPatientById(Number(req.params.id));
	if (!patient) return res.status(404).send('Not found');
	res.render('patient_form', { user: req.session.user, patient, action: 'Update' });
});

app.post('/admin/patients/:id/edit', requireAuth, requireRole(['admin']), (req, res) => {
	const { full_name, room_number, dietary_restrictions, allergies } = req.body;
	updatePatient(Number(req.params.id), { fullName: full_name, roomNumber: room_number, dietaryRestrictions: dietary_restrictions, allergies });
	res.redirect('/admin/patients');
});

app.post('/admin/patients/:id/delete', requireAuth, requireRole(['admin']), (req, res) => {
	deletePatient(Number(req.params.id));
	res.redirect('/admin/patients');
});

app.get('/orders', requireAuth, (req, res) => {
	const orders = getOrders({ status: req.query.status || null, ward: req.query.ward || null });
	const patients = getPatients();
	const menu = getMenu();
	res.render('orders', { user: req.session.user, orders, dayjs, patients, menu });
});

app.post('/orders', requireAuth, requireRole(['nurse','admin']), (req, res) => {
	const { patient_id, item_id, special_instructions } = req.body;
	const orderId = createOrder({
		patientId: Number(patient_id),
		itemId: Number(item_id),
		specialInstructions: special_instructions,
		userId: req.session.user.id
	});
	const order = getOrderById(orderId);
	io.emit('orders:updated', { type: 'created', orderId, order });
	res.redirect('/orders');
});

app.post('/orders/:id/status', requireAuth, requireRole(['kitchen','delivery','admin']), (req, res) => {
	const { id } = req.params;
	const { status } = req.body;
	updateOrderStatus(Number(id), status, req.session.user.id);
	const order = getOrderById(Number(id));
	io.emit('orders:updated', { type: 'status', orderId: Number(id), status, order });
	res.redirect('/orders');
});

// Delivery marks consumption (eaten/partial/refused)
app.post('/orders/:id/consumption', requireAuth, requireRole(['delivery','admin']), (req, res) => {
	const { id } = req.params;
	const { consumption_status } = req.body;
	const allowed = ['eaten','partial','refused'];
	const status = allowed.includes(consumption_status) ? consumption_status : 'unknown';
	updateOrderConsumption(Number(id), status, req.session.user.id);
	const order = getOrderById(Number(id));
	io.emit('orders:updated', { type: 'consumption', orderId: Number(id), consumption_status: status, order });
	res.redirect('/orders');
});

app.get('/menu', requireAuth, (req, res) => {
	const menu = getMenu();
	res.render('menu', { user: req.session.user, menu });
});

// Reports & Analytics (Admin)
app.get('/admin/reports', requireAuth, requireRole(['admin']), (req, res) => {
	const days = Number(req.query.days) || 14;
	const weeks = Number(req.query.weeks) || 8;
	const daily = getDailyMealCounts(days);
	const weekly = getWeeklyMealCounts(weeks);
	const topDishes = getMostRequestedDishes(10);
	const byDiet = getOrdersByDietaryRestriction();
	const wasteByWardDaily = getWasteByWardDaily(days);
	res.render('reports', { user: req.session.user, daily, weekly, topDishes, byDiet, wasteByWardDaily });
});

// CSV export
app.get('/admin/reports/export.csv', requireAuth, requireRole(['admin']), (req, res) => {
	const daily = getDailyMealCounts(30);
	const weekly = getWeeklyMealCounts(12);
	const topDishes = getMostRequestedDishes(25);
	const byDiet = getOrdersByDietaryRestriction();
	const waste = getWasteByWardDaily(30);

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

	const daily = getDailyMealCounts(14);
	const weekly = getWeeklyMealCounts(8);
	const topDishes = getMostRequestedDishes(10);
	const byDiet = getOrdersByDietaryRestriction();
	const waste = getWasteByWardDaily(14);

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

app.post('/admin/menu/indian', requireAuth, requireRole(['admin']), (req, res) => {
	replaceMenuWithIndian();
	io.emit('orders:updated', { type: 'menu_reloaded' });
	res.redirect('/menu');
});

// Tiffin Order Management - Receptionist Dashboard
app.get('/receptionist/tiffin-orders', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	const filter = {
		status: req.query.status || null,
		ward: req.query.ward || null,
		orderDate: req.query.orderDate || null
	};
	const orders = getTiffinOrders(filter);
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

app.post('/receptionist/tiffin-orders/new', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes } = req.body;
	createTiffinOrder({
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

app.get('/receptionist/tiffin-orders/:id/edit', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	const order = getTiffinOrderById(Number(req.params.id));
	if (!order) return res.status(404).send('Order not found');
	res.render('tiffin_order_form', { user: req.session.user, order, action: 'Update' });
});

app.post('/receptionist/tiffin-orders/:id/edit', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes, status } = req.body;
	updateTiffinOrder(Number(req.params.id), {
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

app.post('/receptionist/tiffin-orders/:id/delete', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	deleteTiffinOrder(Number(req.params.id));
	res.redirect('/receptionist/tiffin-orders');
});

app.post('/receptionist/tiffin-orders/:id/status', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	const { id } = req.params;
	const { status } = req.body;
	updateTiffinOrderStatus(Number(id), status, req.session.user.id);
	res.redirect('/receptionist/tiffin-orders');
});

// REST API endpoints for tiffin orders
app.get('/api/tiffin-orders', requireAuth, (req, res) => {
	const filter = {
		status: req.query.status || null,
		ward: req.query.ward || null,
		orderDate: req.query.orderDate || null
	};
	const orders = getTiffinOrders(filter);
	res.json(orders);
});

app.post('/api/tiffin-orders', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes } = req.body;
	const orderId = createTiffinOrder({
		patientName: patient_name,
		ward: ward,
		foodType: food_type,
		quantity: Number(quantity) || 1,
		orderDate: order_date,
		notes: notes,
		userId: req.session.user.id
	});
	const order = getTiffinOrderById(orderId);
	res.json({ success: true, order });
});

app.put('/api/tiffin-orders/:id', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes, status } = req.body;
	updateTiffinOrder(Number(req.params.id), {
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

app.delete('/api/tiffin-orders/:id', requireAuth, requireRole(['receptionist', 'admin']), (req, res) => {
	deleteTiffinOrder(Number(req.params.id));
	res.json({ success: true });
});

// JWT Authentication endpoints
app.post('/api/auth/login', (req, res) => {
	const { username, password, userType } = req.body;
	const user = getUserByUsername(username);
	
	if (!user) {
		return res.status(401).json({ 
			error: 'Invalid credentials',
			code: 'INVALID_CREDENTIALS'
		});
	}
	
	// Check user type and role
	if (userType === 'mess' && user.role !== 'admin') {
		return res.status(401).json({ 
			error: 'Insufficient privileges for mess owner access',
			code: 'INSUFFICIENT_PRIVILEGES'
		});
	}
	
	if (userType === 'hospital' && !['nurse', 'kitchen', 'delivery', 'receptionist'].includes(user.role)) {
		return res.status(401).json({ 
			error: 'Insufficient privileges for hospital access',
			code: 'INSUFFICIENT_PRIVILEGES'
		});
	}
	
	if (!bcrypt.compareSync(password, user.password_hash)) {
		return res.status(401).json({ 
			error: 'Invalid credentials',
			code: 'INVALID_CREDENTIALS'
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
app.get('/api/tiffin-orders', jwtAuthMiddleware, (req, res) => {
	const filter = {
		status: req.query.status || null,
		ward: req.query.ward || null,
		orderDate: req.query.orderDate || null
	};
	const orders = getTiffinOrders(filter);
	res.json(orders);
});

app.post('/api/tiffin-orders', jwtAuthMiddleware, jwtRequireRole(['receptionist', 'admin']), (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes } = req.body;
	const orderId = createTiffinOrder({
		patientName: patient_name,
		ward: ward,
		foodType: food_type,
		quantity: Number(quantity) || 1,
		orderDate: order_date,
		notes: notes,
		userId: req.user.id
	});
	const order = getTiffinOrderById(orderId);
	res.json({ success: true, order });
});

app.put('/api/tiffin-orders/:id', jwtAuthMiddleware, jwtRequireRole(['receptionist', 'admin']), (req, res) => {
	const { patient_name, ward, food_type, quantity, order_date, notes, status } = req.body;
	updateTiffinOrder(Number(req.params.id), {
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

app.delete('/api/tiffin-orders/:id', jwtAuthMiddleware, jwtRequireRole(['receptionist', 'admin']), (req, res) => {
	deleteTiffinOrder(Number(req.params.id));
	res.json({ success: true });
});

app.get('/patients', requireAuth, (req, res) => {
	const patients = getPatients();
	res.json(patients);
});

io.on('connection', () => {});

server.listen(APP_PORT, () => {
	console.log(`🚀 Server running on http://localhost:${APP_PORT}`);
	console.log(`📊 Connected to SQLite database: hospital_meals.sqlite`);
	console.log(`🔐 JWT Authentication enabled`);
	console.log(`🍱 Receptionist Dashboard available`);
	console.log(`\n🔑 Login Credentials:`);
	console.log(`   Admin: messowner / mess123`);
	console.log(`   Admin: admin / admin123`);
	console.log(`   Nurse: nurse1 / nurse123`);
	console.log(`   Kitchen: kitchen1 / kitchen123`);
	console.log(`   Delivery: delivery1 / delivery123`);
	console.log(`   Receptionist: receptionist1 / reception123`);
});
