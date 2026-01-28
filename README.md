# 🏥 Hospital Meal Ordering System

A comprehensive, real-time meal ordering and tracking system designed for hospitals. Features advanced real-time communication, role-based access control, and a modern responsive user interface.

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** November 27, 2025

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Real-Time Features](#real-time-features)
- [User Roles & Permissions](#user-roles--permissions)
- [Authentication](#authentication)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The Hospital Meal Ordering System is a full-stack web application that manages meal ordering, preparation, delivery, and tracking for hospital patients. It provides real-time updates across multiple departments and roles, ensuring efficient meal service delivery.

**Key Capabilities:**
- Multi-role authentication system (Admin, Nurse, Kitchen, Delivery, Receptionist)
- Real-time order tracking and status updates
- Emergency notification system
- Delivery location tracking (GPS)
- Comprehensive reporting and analytics
- Tiffin order management for receptionists
- Meal menu management
- Patient dietary restriction tracking
- Waste tracking and analytics

---

## ✨ Features

### 🔐 Authentication & Authorization
- ✅ JWT-based token authentication (24-hour expiry)
- ✅ Role-Based Access Control (RBAC)
- ✅ Rate limiting on login (5 attempts per 15 minutes)
- ✅ Session management with 8-hour timeout
- ✅ Token refresh mechanism
- ✅ Token blacklisting on logout
- ✅ Secure password hashing with bcrypt

### 📡 Real-Time Features
- ✅ **Role-Based WebSocket Rooms** - 7 unique rooms for different departments
- ✅ **Live Order Status Updates** - 7 event types for order lifecycle
- ✅ **Emergency Notifications** - Priority-based alerts with sound and modal dialogs
- ✅ **Delivery Location Tracking** - Real-time GPS coordinates
- ✅ **System-Wide Broadcasts** - Role-targeted announcements
- ✅ **Auto-Reconnection** - 5 attempts with exponential backoff
- ✅ **Typing Indicators** - Real-time user activity tracking
- ✅ **User Presence** - Connected users monitoring

### 📊 Order Management
- ✅ Create orders with patient selection
- ✅ Track order status through lifecycle (placed → kitchen → delivery → delivered)
- ✅ Update consumption status (eaten, partial, refused)
- ✅ Track waste percentage per meal
- ✅ Order history and archiving
- ✅ Bulk order operations

### 👥 Patient Management
- ✅ Patient registration and records
- ✅ Dietary restrictions tracking
- ✅ Allergy management
- ✅ Room and ward assignment
- ✅ Patient search and filtering

### 🍱 Menu Management
- ✅ Dynamic menu item management
- ✅ Dietary category assignment
- ✅ Menu scheduling
- ✅ Seasonal updates
- ✅ Item availability control

### 📈 Reporting & Analytics
- ✅ Daily meal count analytics
- ✅ Weekly consumption trends
- ✅ Most requested dishes
- ✅ Dietary restriction analysis
- ✅ Waste tracking by ward
- ✅ Export reports (CSV, PDF, Excel)

### 🍲 Tiffin Order Management
- ✅ External tiffin order creation and tracking
- ✅ Status workflow (pending → confirmed → preparing → ready → delivered)
- ✅ Patient name and ward tracking
- ✅ Food type and quantity management
- ✅ Special notes and instructions

### 🎨 User Interface
- ✅ Modern, responsive design
- ✅ Mobile-first approach
- ✅ Gradient color scheme
- ✅ Real-time notification toasts
- ✅ Dark/light theme ready
- ✅ Accessible form controls

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────┐
│           BROWSER CLIENTS                       │
│  (Multiple users with different roles)          │
└────────────────┬────────────────────────────────┘
                 │ WebSocket + HTTP
                 ▼
┌─────────────────────────────────────────────────┐
│     EXPRESS.JS SERVER (localhost:3001)          │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Socket.IO Real-Time Manager            │   │
│  │  - Room Management                      │   │
│  │  - Event Broadcasting                   │   │
│  │  - User Connection Tracking             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Express Routes & Middleware            │   │
│  │  - Authentication                       │   │
│  │  - Authorization                        │   │
│  │  - Rate Limiting                        │   │
│  │  - Session Management                   │   │
│  └─────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │ SQL Queries
                 ▼
┌─────────────────────────────────────────────────┐
│     MYSQL DATABASE (hospital_meals)             │
│     localhost:3306                              │
│                                                 │
│  Tables:                                        │
│  ├─ users (6 seeded)                           │
│  ├─ orders (with status tracking)              │
│  ├─ tiffin_orders (receptionist)               │
│  ├─ patients (dietary & allergy info)          │
│  ├─ menu_items (meals & categories)            │
│  ├─ audit_logs (all events)                    │
│  └─ Additional tracking tables                 │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js (v14+)
- **Framework:** Express.js 5.x
- **Real-Time:** Socket.IO 4.x
- **Database:** MySQL 5.7+ / MariaDB
- **Authentication:** JWT + bcrypt
- **ORM:** mysql2 / better-sqlite3

### Frontend
- **Templating:** EJS
- **CSS Framework:** Custom modern design system
- **Client Library:** Socket.IO Client
- **Styling:** CSS3 with CSS Variables
- **Icons:** Unicode Emojis

### Frontend (React Dashboard)
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **CSS:** Tailwind CSS
- **Components:** Custom & composable
- **State:** React Hooks

### Tools & Libraries
- **Package Manager:** npm
- **Development:** Nodemon
- **Documentation:** PDF Kit, ExcelJS
- **Session:** express-session
- **Compression:** compression
- **Date:** dayjs

---

## 📥 Installation

### Prerequisites
- Node.js v14 or higher
- MySQL 5.7 or higher
- npm or yarn package manager
- Git (for cloning)

### Step 1: Clone Repository
```bash
git clone https://github.com/raxtar9822/Collage_Project.git
cd COLLAGE_PROJECT
```

### Step 2: Install Dependencies
```bash
npm install
```

This installs all required packages:
- Express.js, Socket.IO, JWT, bcrypt
- Database drivers (mysql2, better-sqlite3)
- Session management, compression
- PDF & Excel export libraries

### Step 3: Environment Setup
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit `.env` with your configuration (see Configuration section).

### Step 4: Database Setup
```bash
# MySQL database will be automatically created
# Run the application to initialize tables
npm start
```

---

## ⚙️ Configuration

### Environment Variables (.env)

```properties
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DB_TYPE=mysql
DB_DRIVER=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=hospital_meals

# Security
JWT_SECRET=your_secret_key_here
SESSION_SECRET=your_session_secret_here

# Optional
LOG_LEVEL=info
CORS_ORIGIN=*
```

### Database Connection
The system uses MySQL for production. Update `src/mysql-config.js`:

```javascript
module.exports = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
};
```

---

## 🗄️ Database Setup

### Automatic Initialization
When you start the application, the database automatically:
1. Creates the `hospital_meals` database if it doesn't exist
2. Creates all required tables
3. Seeds 6 default users with different roles
4. Initializes indexes and relationships

### Manual Database Setup

```sql
-- Create database
CREATE DATABASE hospital_meals;
USE hospital_meals;

-- Tables are auto-created by the application
-- See src/db.js and src/db-mysql.js for schema
```

### Default Seeded Users

| Username | Password | Role | Access |
|----------|----------|------|--------|
| messowner | mess123 | admin | Mess management |
| admin | admin123 | admin | Full system |
| nurse1 | nurse123 | nurse | Orders, patients |
| kitchen1 | kitchen123 | kitchen | Kitchen prep |
| delivery1 | delivery123 | delivery | Delivery, location |
| receptionist1 | reception123 | receptionist | Tiffin orders |

---

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
Uses Nodemon for auto-restart on file changes.

### Production Mode
```bash
npm start
```

### Expected Output
```
✅ Connected to MySQL database: localhost:3306/hospital_meals
✅ All MySQL tables created/verified
[Seed] ✅ Created messowner
[Seed] ✅ Created admin
[Seed] ✅ Created nurse1
[Seed] ✅ Created kitchen1
[Seed] ✅ Created delivery1
[Seed] ✅ Created receptionist1

🚀 Server running on http://localhost:3001
📊 Database: MySQL (hospital_meals)
🔐 Enhanced JWT Authentication enabled
⚡ Real-time WebSocket system active
```

### Access the Application
- **URL:** http://localhost:3001
- **Login Page:** http://localhost:3001/login
- **Dashboard:** http://localhost:3001/dashboard (after login)

---

## 📡 API Documentation

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123",
  "userType": "mess|hospital"
}

Response 200:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "fullName": "System Admin",
    "userType": "mess_owner"
  },
  "expiresIn": "24h"
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "user": {...},
  "valid": true
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "token": "new_token...",
  "user": {...},
  "expiresIn": "24h"
}
```

### Real-Time Endpoints

#### Get Real-Time Status
```http
GET /api/realtime/status
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "connectedUsers": 8,
  "userCounts": {
    "admin": 2,
    "nurse": 3,
    "kitchen": 2,
    "delivery": 1
  },
  "rooms": ["admin-room", "nurse-room", ...]
}
```

#### Send Broadcast
```http
POST /api/realtime/broadcast
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "System notification text",
  "type": "info|warning|error|success",
  "targetRoles": []
}

Response 200:
{
  "success": true,
  "message": "Notification broadcasted successfully"
}
```

#### Send Emergency Alert
```http
POST /api/realtime/emergency
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "emergency",
  "message": "Critical alert message",
  "priority": "high|critical",
  "orderId": 123
}

Response 200:
{
  "success": true,
  "notification": {...}
}
```

### Order Endpoints

#### Get Orders
```http
GET /orders?status=placed&ward=A
Authorization: Required

Response: [order1, order2, ...]
```

#### Create Order
```http
POST /orders
Content-Type: application/json
Authorization: Required (nurse, admin)

{
  "patient_id": 1,
  "item_id": 5,
  "special_instructions": "No spice"
}

Response: Redirect to /orders
```

#### Update Order Status
```http
POST /orders/:id/status
Content-Type: application/json
Authorization: Required (kitchen, delivery, admin)

{
  "status": "in_kitchen|out_for_delivery|delivered"
}

Response: Redirect to /orders
```

---

## 📡 Real-Time Features

### WebSocket Rooms

| Room | Users | Purpose |
|------|-------|---------|
| admin-room | Admin | System-wide management |
| nurse-room | Nurses | Patient care coordination |
| kitchen-room | Kitchen staff | Meal preparation |
| delivery-room | Delivery staff | Order delivery |
| receptionist-room | Receptionists | Tiffin order management |
| orders-room | All | Order broadcasts |
| notifications-room | All | General notifications |

### Real-Time Events

#### Order Events
```javascript
// Order created
{
  event: 'order-created',
  data: { order, timestamp }
}

// Status updated
{
  event: 'order-status-updated',
  data: { orderId, status, updatedBy, timestamp }
}

// Order delivered
{
  event: 'order-delivered',
  data: { orderId, status, deliveredAt }
}
```

#### Emergency Events
```javascript
{
  event: 'emergency-notification',
  data: {
    id: 1700042400000,
    type: 'emergency',
    message: 'Alert message',
    priority: 'high|critical',
    sender: { id, username, role, fullName },
    timestamp: '2025-11-27T11:00:00Z'
  }
}
```

#### Location Events
```javascript
{
  event: 'delivery-location-updated',
  data: {
    deliveryPerson: { id, username, fullName },
    location: { latitude, longitude },
    orderId: 123,
    status: 'in_transit',
    timestamp: '2025-11-27T11:05:00Z'
  }
}
```

---

## 👥 User Roles & Permissions

### Role Matrix

| Feature | Admin | Nurse | Kitchen | Delivery | Receptionist |
|---------|-------|-------|---------|----------|--------------|
| Create Orders | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update Order Status | ✅ | ❌ | ✅ | ✅ | ❌ |
| Track Delivery | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage Patients | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Menu | ✅ | ✅ | ✅ | ✅ | ✅ |
| Generate Reports | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Tiffin Orders | ✅ | ❌ | ❌ | ❌ | ✅ |
| Send Broadcasts | ✅ | ❌ | ❌ | ❌ | ❌ |
| Emergency Alerts | ✅ | ✅ | ✅ | ✅ | ✅ |

### Role Descriptions

**👨‍💼 Admin (Mess Owner)**
- Full system access
- User and patient management
- Menu management
- Report generation
- System-wide broadcasts
- Emergency notifications

**👨‍⚕️ Nurse**
- Create meal orders
- Track patient meals
- View menu and patient info
- Receive delivery updates
- Send emergency alerts

**👨‍🍳 Kitchen Staff**
- View pending orders
- Update order status (in_kitchen, ready)
- Access kitchen dashboard
- View special instructions
- Receive emergency alerts

**🚚 Delivery Personnel**
- View orders ready for delivery
- Update delivery status
- Send location updates
- Confirm delivery
- Mark consumption

**📋 Receptionist**
- Create tiffin orders
- Track tiffin order status
- View patient information
- Access receptionist dashboard

---

## 🔐 Authentication

### JWT Token Structure
```javascript
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "full_name": "System Admin",
  "iat": 1700042400,
  "exp": 1700128800
}
```

### Token Lifecycle
1. **Login** → Generate 24-hour JWT token
2. **Store** → Client stores in localStorage
3. **Use** → Include in `Authorization: Bearer {token}` header
4. **Refresh** → Get new token before expiry via refresh endpoint
5. **Logout** → Token blacklisted, cannot be reused

### Security Features
- ✅ Bcrypt password hashing
- ✅ JWT signature verification
- ✅ Rate limiting on login attempts
- ✅ Session timeout management
- ✅ Token blacklisting
- ✅ HTTPS ready (in production)
- ✅ CORS configuration
- ✅ HttpOnly cookies for sessions

---

## 🧪 Testing

### Manual Testing

#### 1. Socket Listener Test
Listen for all real-time events:
```bash
node scripts/socket-listener.js
```

#### 2. Send Test Broadcast
Send test system notification:
```bash
node scripts/send-test-broadcast.js
```

#### 3. API Testing with cURL

Login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","userType":"mess"}'
```

Check real-time status:
```bash
curl -X GET http://localhost:3001/api/realtime/status \
  -H "Authorization: Bearer {TOKEN}"
```

### Unit Testing (Recommended)
```bash
npm test
```

### Integration Testing
1. Navigate to http://localhost:3001/login
2. Login with test credentials
3. Create an order
4. Track order in real-time
5. Update status and verify broadcast
6. Check WebSocket events in browser console

---

## 📁 Project Structure

```
COLLAGE_PROJECT/
├── src/
│   ├── server.js                 # Express server & routes
│   ├── realtime.js               # Socket.IO real-time manager
│   ├── auth.js                   # JWT & auth functions
│   ├── db.js                     # SQLite database (backup)
│   ├── db-mysql.js               # MySQL database driver
│   ├── cache.js                  # Caching utilities
│   └── mysql-config.js           # MySQL connection config
│
├── views/
│   ├── login.ejs                 # Login page
│   ├── layout.ejs                # Base layout template
│   ├── dashboard.ejs             # Main dashboard
│   ├── orders.ejs                # Orders management
│   ├── patients_admin.ejs        # Patient management
│   ├── tiffin_orders.ejs         # Tiffin order tracking
│   ├── reports.ejs               # Analytics & reports
│   └── menu_simple.ejs           # Menu display
│
├── public/
│   ├── css/
│   │   └── styles.css            # Main CSS file
│   └── js/
│       ├── realtime.js           # Client real-time handler
│       └── notifications.js      # Notification system
│
├── hospital-meal-dashboard/      # React/TypeScript frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/           # React components
│   │   ├── services/
│   │   │   ├── api.ts           # API calls
│   │   │   └── socket.ts        # Socket.IO service
│   │   └── hooks/
│   │       └── useRealtime.ts   # Real-time hook
│   ├── package.json
│   └── vite.config.ts
│
├── scripts/
│   ├── socket-listener.js        # Real-time event listener
│   └── send-test-broadcast.js    # Test broadcaster
│
├── database/
│   └── hospital_meals.sqlite     # SQLite (backup)
│
├── .env                          # Environment variables
├── .env.example                  # Example env file
├── package.json                  # Dependencies
└── README.md                     # This file
```

---

## 🐛 Troubleshooting

### Database Connection Issues
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution:**
1. Ensure MySQL is running: `mysql -u root -p`
2. Check `.env` database credentials
3. Create database: `CREATE DATABASE hospital_meals;`

### Port Already in Use
```
Error: listen EADDRINUSE :::3001
```
**Solution:**
```bash
# Find process using port 3001
netstat -ano | findstr :3001
# Kill process (Windows)
taskkill /PID {PID} /F
```

### WebSocket Connection Failed
```
Socket.IO: connect error
```
**Solution:**
1. Clear browser cache and cookies
2. Ensure server is running on correct port
3. Check CORS configuration in `src/realtime.js`
4. Verify firewall allows WebSocket connections

### Authentication Errors
```
Error: Invalid credentials
Error: Token refresh failed
```
**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Log out and log back in
3. Check JWT_SECRET in .env
4. Verify user exists in database

### Performance Issues
**Solution:**
1. Enable query caching: `src/cache.js`
2. Add database indexes
3. Implement pagination for large result sets
4. Monitor WebSocket connections: `/api/realtime/status`

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test
3. Commit: `git commit -am 'Add feature'`
4. Push: `git push origin feature/my-feature`
5. Submit Pull Request

### Code Guidelines
- Follow Node.js best practices
- Use meaningful variable names
- Add comments for complex logic
- Test changes before submitting
- Update documentation

### Reporting Issues
1. Check existing issues first
2. Provide detailed description
3. Include error messages and logs
4. Specify system/browser information
5. Provide reproduction steps

---

## 📄 License

This project is licensed under the ISC License.

---

## 📞 Support

For issues, questions, or suggestions:

1. **Check Documentation:** Review this README and project docs
2. **Search Issues:** Look for existing issue reports
3. **Create Issue:** Submit detailed bug reports or feature requests
4. **Contact Team:** Reach out to development team

---

## 🎉 Quick Start Checklist

- [ ] Clone repository
- [ ] Install dependencies: `npm install`
- [ ] Setup `.env` file with MySQL credentials
- [ ] Ensure MySQL is running
- [ ] Start server: `npm start`
- [ ] Open http://localhost:3001 in browser
- [ ] Login with demo credentials
- [ ] Explore dashboard and features
- [ ] Read through documentation

---

## 📊 Changelog

### Version 1.0.0 (November 27, 2025)
- ✅ Initial release
- ✅ Real-time WebSocket system
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Order management
- ✅ Tiffin order system
- ✅ Reporting & analytics
- ✅ Emergency notifications
- ✅ Delivery location tracking
- ✅ Modern responsive UI

---

## 🙏 Acknowledgments

- Express.js community
- Socket.IO for real-time capabilities
- MySQL for database
- Node.js ecosystem

---

**Built with ❤️ for efficient hospital meal management**

*Last Updated: November 27, 2025 | Status: Production Ready*
