# 🏥 Hospital Meal Ordering & Tracking System

A comprehensive digital solution for managing patient meal orders in small to mid-sized hospitals, replacing outdated manual processes with a modern, efficient system.

## 🛠 Problem Statement

In many small to mid-sized hospitals, the process of managing patient meal orders is still reliant on outdated manual methods such as handwritten notes, verbal communication, and phone calls. These practices often lead to critical inefficiencies including:

- ❌ **Missed or delayed meal deliveries** - Manual tracking leads to orders falling through the cracks
- 🍽 **Incorrect meal orders due to miscommunication** - Verbal orders and handwritten notes are prone to errors
- 📉 **Lack of accountability and audit trails** - No systematic way to track who ordered what and when
- 👥 **Overdependence on specific staff members** - Critical knowledge and processes tied to individual staff
- 🕒 **Absence of real-time updates and centralized tracking** - No visibility into order status across departments

Such issues not only disrupt operational workflows but also compromise patient care and satisfaction. The absence of a structured digital system makes it difficult to ensure timely, accurate, and traceable meal service, especially in dynamic hospital environments where patient needs frequently change.

## ✨ Solution

This Hospital Meal Ordering & Tracking System provides:

- **📱 Digital Order Management** - Replace paper-based systems with digital order placement and tracking
- **🔄 Real-time Status Updates** - Live tracking from order placement to delivery
- **👥 Role-based Access Control** - Separate interfaces for nurses, kitchen staff, and delivery personnel
- **📊 Comprehensive Reporting** - Analytics on meal patterns, waste tracking, and dietary requirements
- **🔍 Complete Audit Trail** - Track all actions and changes for accountability
- **🍽 Dietary Management** - Handle special dietary requirements and allergies
- **📈 Waste Tracking** - Monitor food waste and consumption patterns

## 🚀 Features

### For Nurses
- Place meal orders for patients
- View patient dietary restrictions and allergies
- Track order status in real-time

### For Kitchen Staff
- View pending orders
- Update order status (in kitchen → out for delivery)
- Manage menu items

### For Delivery Personnel
- View orders ready for delivery
- Mark delivery status
- Record consumption (eaten/partial/refused)

### For Administrators
- Patient management
- Menu management
- Comprehensive reporting and analytics
- System configuration

## 🔐 Authentication & Access Control

### Web Interface Login Credentials

#### Admin Accounts
- **Username:** `messowner` | **Password:** `mess123`
- **Username:** `admin` | **Password:** `admin123`

#### Staff Accounts
- **Username:** `nurse1` | **Password:** `nurse123` (Role: Nurse)
- **Username:** `kitchen1` | **Password:** `kitchen123` (Role: Kitchen)
- **Username:** `delivery1` | **Password:** `delivery123` (Role: Delivery)
- **Username:** `receptionist1` | **Password:** `reception123` (Role: Receptionist)

### JWT API Authentication
The system supports JWT (JSON Web Token) authentication for secure API access:

- **Login Endpoint:** `POST /api/auth/login`
- **Token Verification:** `GET /api/auth/verify`
- **Token Refresh:** `POST /api/auth/refresh`
- **Logout:** `POST /api/auth/logout`

**Example API Login:**
```json
POST /api/auth/login
{
  "username": "receptionist1",
  "password": "reception123",
  "userType": "hospital"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 6,
    "username": "receptionist1",
    "role": "receptionist",
    "full_name": "Receptionist Sarah",
    "userType": "receptionist"
  },
  "expiresIn": "24h"
}
```

📖 **Complete API Documentation:** See `API_DOCUMENTATION.md` for detailed JWT authentication guide.


## 🛠 Technology Stack

- **Backend:** Node.js, Express.js
- **Database:**
  - SQLite (default, for quick setup)
  - MySQL (for production or multi-user environments)
- **Frontend:** EJS templating engine
- **Authentication:**
  - bcrypt for password hashing
  - JWT (JSON Web Tokens) for API authentication
  - express-session for web interface
- **Real-time Updates:** Socket.io
- **Reporting:** PDFKit, ExcelJS for exports
- **API Security:** Role-based access control with JWT middleware

## 🍽 Menu Management

- **Hospital Menu:** Use the built-in function `replaceMenuWithHospital()` to reset the menu to standard hospital items.
- **Indian Menu:** Use `replaceMenuWithIndian()` to switch to an Indian menu set.
- Menu management is available via admin dashboard or can be triggered in code.

## 🗄 MySQL Setup & Troubleshooting

- To use MySQL, update `src/mysql-config.js` with your MySQL host, port, user, and password.
- Ensure your MySQL server is running and accessible.
- Run the schema script `src/mysql-schema.sql` to initialize tables if needed.
- If you encounter connection errors, check your credentials and server status.


## 🚀 Getting Started

1. **Install Dependencies**
```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Access the Application**
   - Open your browser and go to `http://localhost:3000`
   - Use any of the provided login credentials

## 📊 Reports & Analytics

The system provides comprehensive reporting including:
- Daily and weekly meal counts
- Most requested dishes
- Orders by dietary restrictions
- Waste tracking by ward
- Export capabilities (CSV, PDF, Excel)

## 🔧 Development

- **Development Mode:** `npm run dev` (with nodemon for auto-restart)
- **Production Mode:** `npm start`


## 📝 Database Schema

The system supports both SQLite and MySQL with the following main tables:
- `users` - Staff authentication and roles
- `patients` - Patient information and dietary requirements
- `menu_items` - Available meal options
- `orders` - Meal orders with status tracking
- `audit_logs` - Complete action history

## 🎯 Impact

This system addresses the core problems in hospital meal management by:
- **Reducing errors** through digital order management
- **Improving efficiency** with real-time tracking
- **Enhancing accountability** with complete audit trails
- **Supporting better patient care** through dietary management
- **Providing data insights** for continuous improvement

---

*Built with ❤️ for better hospital meal management*