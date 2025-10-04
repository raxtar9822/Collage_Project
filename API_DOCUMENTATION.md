# 🔐 JWT Authentication API Documentation

## Overview
The Hospital Meal Ordering System now supports JWT (JSON Web Token) authentication for secure API access. This provides stateless authentication that can be used by mobile apps, external systems, and web applications.

## Authentication Flow

### 1. Login and Get Token
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "receptionist1",
  "password": "reception123",
  "userType": "hospital"  // or "mess" for admin users
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

### 2. Using the Token
Include the JWT token in the Authorization header for all protected endpoints:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Token Verification
**Endpoint:** `GET /api/auth/verify`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 6,
    "username": "receptionist1",
    "role": "receptionist",
    "full_name": "Receptionist Sarah",
    "userType": "receptionist"
  },
  "valid": true
}
```

### 4. Token Refresh
**Endpoint:** `POST /api/auth/refresh`

**Headers:**
```
Authorization: Bearer <your-token>
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
  }
}
```

### 5. Logout
**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Protected API Endpoints

### Tiffin Orders Management

#### Get All Tiffin Orders
**Endpoint:** `GET /api/tiffin-orders`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, confirmed, preparing, ready, delivered, cancelled)
- `ward` (optional): Filter by ward (Ward A, Ward B, Ward C, ICU, Emergency)
- `orderDate` (optional): Filter by order date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": 1,
    "patient_name": "John Doe",
    "ward": "Ward A",
    "food_type": "Vegetarian",
    "quantity": 2,
    "order_date": "2024-01-15",
    "status": "pending",
    "notes": "No spicy food",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "created_by": 6
  }
]
```

#### Create Tiffin Order
**Endpoint:** `POST /api/tiffin-orders`

**Headers:**
```
Authorization: Bearer <your-token>
Content-Type: application/json
```

**Required Role:** `receptionist` or `admin`

**Request Body:**
```json
{
  "patient_name": "Jane Smith",
  "ward": "Ward B",
  "food_type": "Diabetic",
  "quantity": 1,
  "order_date": "2024-01-15",
  "notes": "Low sugar diet"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": 2,
    "patient_name": "Jane Smith",
    "ward": "Ward B",
    "food_type": "Diabetic",
    "quantity": 1,
    "order_date": "2024-01-15",
    "status": "pending",
    "notes": "Low sugar diet",
    "created_at": "2024-01-15T11:00:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z",
    "created_by": 6
  }
}
```

#### Update Tiffin Order
**Endpoint:** `PUT /api/tiffin-orders/:id`

**Headers:**
```
Authorization: Bearer <your-token>
Content-Type: application/json
```

**Required Role:** `receptionist` or `admin`

**Request Body:**
```json
{
  "patient_name": "Jane Smith",
  "ward": "Ward B",
  "food_type": "Diabetic",
  "quantity": 2,
  "order_date": "2024-01-15",
  "notes": "Low sugar diet - increased quantity",
  "status": "confirmed"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": 2,
    "patient_name": "Jane Smith",
    "ward": "Ward B",
    "food_type": "Diabetic",
    "quantity": 2,
    "order_date": "2024-01-15",
    "status": "confirmed",
    "notes": "Low sugar diet - increased quantity",
    "created_at": "2024-01-15T11:00:00.000Z",
    "updated_at": "2024-01-15T11:30:00.000Z",
    "created_by": 6
  }
}
```

#### Delete Tiffin Order
**Endpoint:** `DELETE /api/tiffin-orders/:id`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Required Role:** `receptionist` or `admin`

**Response:**
```json
{
  "success": true
}
```

## Error Responses

### Authentication Errors
```json
{
  "error": "Access denied. No token provided.",
  "code": "NO_TOKEN"
}
```

```json
{
  "error": "Invalid or expired token.",
  "code": "INVALID_TOKEN"
}
```

```json
{
  "error": "Insufficient permissions.",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["receptionist", "admin"],
  "userRole": "nurse"
}
```

### Login Errors
```json
{
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

```json
{
  "error": "Insufficient privileges for hospital access",
  "code": "INSUFFICIENT_PRIVILEGES"
}
```

## User Roles and Permissions

| Role | Description | API Access |
|------|-------------|------------|
| `admin` | System Administrator | Full access to all endpoints |
| `receptionist` | Receptionist | Full access to tiffin orders |
| `nurse` | Hospital Nurse | Read-only access to orders |
| `kitchen` | Kitchen Staff | Read-only access to orders |
| `delivery` | Delivery Personnel | Read-only access to orders |

## Security Features

### JWT Token Security
- **Secret Key**: Configurable via `JWT_SECRET` environment variable
- **Expiration**: 24 hours (configurable via `JWT_EXPIRES_IN`)
- **Issuer**: `hospital-meals-system`
- **Audience**: `hospital-staff`
- **Algorithm**: HS256 (HMAC with SHA-256)

### Password Security
- **Hashing**: bcrypt with salt rounds
- **Storage**: Passwords are never stored in plain text

### Audit Logging
- All authentication events are logged
- Token generation and validation are tracked
- Failed login attempts are recorded

## Example Usage with JavaScript

```javascript
// Login and get token
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'receptionist1',
    password: 'reception123',
    userType: 'hospital'
  })
});

const { token, user } = await loginResponse.json();

// Use token for API calls
const ordersResponse = await fetch('/api/tiffin-orders', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const orders = await ordersResponse.json();
```

## Example Usage with cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"receptionist1","password":"reception123","userType":"hospital"}'

# Get orders (replace TOKEN with actual token)
curl -X GET http://localhost:3000/api/tiffin-orders \
  -H "Authorization: Bearer TOKEN"

# Create order
curl -X POST http://localhost:3000/api/tiffin-orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_name":"John Doe","ward":"Ward A","food_type":"Vegetarian","quantity":1,"order_date":"2024-01-15"}'
```

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Session Configuration
SESSION_SECRET=your-session-secret-key
```

---

*This JWT authentication system provides secure, stateless access to the Hospital Meal Ordering System API, enabling integration with mobile apps, external systems, and third-party applications.*





