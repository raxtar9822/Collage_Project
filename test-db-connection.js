/**
 * Database Connection Test Script
 * Run this to verify your database connection is working
 * Usage: node test-db-connection.js
 */

console.log('🧪 Testing database connection...\n');

try {
	const db = require('./src/db');
	
	console.log('✅ Database module loaded successfully');
	console.log('📦 Database type: SQLite (default)');
	console.log('📊 Available functions:', Object.keys(db).filter(k => typeof db[k] === 'function').length, 'functions');
	
	// Test getUserByUsername
	const { getUserByUsername } = db;
	const testUser = getUserByUsername('admin');
	
	if (testUser) {
		console.log('✅ Database query test: SUCCESS');
		console.log('   Found user:', testUser.username, 'with role:', testUser.role);
	} else {
		console.log('⚠️  Database query test: No users found (database may be empty)');
	}
	
	// Test getMenu
	const menu = db.getMenu();
	console.log('✅ Menu items:', menu.length, 'items found');
	
	// Test getPatients
	const patients = db.getPatients();
	console.log('✅ Patients:', patients.length, 'patients found');
	
	console.log('\n✅ All database tests passed!');
	console.log('🚀 Your database is connected and ready to use.');
	
} catch (error) {
	console.error('❌ Database connection test failed:', error.message);
	console.error(error.stack);
	process.exit(1);
}

