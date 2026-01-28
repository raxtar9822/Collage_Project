# Database Setup Guide

## Overview

The Hospital Meal Ordering System supports two database options:
- **SQLite** (default) - File-based database, no setup required
- **MySQL** - Requires MySQL server installation

## Current Configuration

✅ **Database Status**: Connected and working
- **Type**: SQLite (default)
- **Location**: `./database/hospital_meals.sqlite`
- **Status**: All tables created, data seeded

## SQLite (Default - Currently Active)

SQLite is the default database and requires no additional setup. The database file is automatically created at:
```
./database/hospital_meals.sqlite
```

### Features:
- ✅ Zero configuration required
- ✅ Automatic table creation
- ✅ Sample data seeding
- ✅ Perfect for development and small deployments

### Testing Connection:
```bash
node test-db-connection.js
```

## MySQL Setup (Optional)

To use MySQL instead of SQLite:

### 1. Install MySQL Server
- Download and install MySQL from https://dev.mysql.com/downloads/mysql/
- Or use XAMPP/WAMP which includes MySQL

### 2. Create Database
Run the SQL script to create the database and tables:
```bash
mysql -u root -p < mysql-setup.sql
```

Or manually:
```sql
CREATE DATABASE hospital_meals;
USE hospital_meals;
-- Then run the SQL from mysql-setup.sql
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=hospital_meals
```

### 4. Update server.js
To use MySQL, you'll need to modify `src/server.js` to import from `db-mysql.js` instead of `db.js`:
```javascript
// Change from:
const { ... } = require('./db');

// To:
const { ... } = require('./db-mysql');
```

### 5. Initialize MySQL Database
The `db-mysql.js` module includes a `seedOnce()` function that will automatically create sample data when the server starts.

## Database Schema

The database includes the following tables:
- `users` - System users (admin, nurse, kitchen, delivery, receptionist)
- `patients` - Patient information
- `menu_items` - Available menu items
- `orders` - Meal orders
- `tiffin_orders` - Tiffin/box meal orders
- `audit_logs` - System audit trail

## Default Users

The system comes with pre-configured users:

| Username | Password | Role | Access |
|----------|----------|------|--------|
| messowner | mess123 | admin | Full access |
| admin | admin123 | admin | Full access |
| nurse1 | nurse123 | nurse | Read orders, create orders |
| kitchen1 | kitchen123 | kitchen | View orders, update status |
| delivery1 | delivery123 | delivery | View orders, update delivery status |
| receptionist1 | reception123 | receptionist | Manage tiffin orders |

## Testing Database Connection

Run the test script:
```bash
node test-db-connection.js
```

This will verify:
- ✅ Database module loads correctly
- ✅ Database connection is working
- ✅ Tables are accessible
- ✅ Sample data is present

## Troubleshooting

### SQLite Issues
- **Database file not found**: The database directory will be created automatically
- **Permission errors**: Ensure the application has write permissions to the `database/` directory

### MySQL Issues
- **Connection refused**: Check if MySQL server is running
- **Access denied**: Verify MySQL username and password in `.env`
- **Database not found**: Run `mysql-setup.sql` to create the database and tables

## Migration from SQLite to MySQL

1. Export data from SQLite (if needed)
2. Set up MySQL database (see MySQL Setup above)
3. Import data into MySQL
4. Update environment variables
5. Update server.js to use db-mysql.js
6. Restart the server

## Current Status

✅ **Database**: Connected
✅ **Tables**: Created
✅ **Sample Data**: Loaded
✅ **Functions**: All 25 database functions exported and working

You can now start the server:
```bash
npm start
```

Or in development mode:
```bash
npm run dev
```

