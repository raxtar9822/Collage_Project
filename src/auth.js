const jwt = require('jsonwebtoken');
const { getUserByUsername } = require('./db-mysql');

const JWT_SECRET = process.env.JWT_SECRET || 'hospital-meals-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for user
 * @param {Object} user - User object with id, username, role, full_name
 * @returns {string} JWT token
 */
function generateToken(user) {
	const payload = {
		id: user.id,
		username: user.username,
		role: user.role,
		full_name: user.full_name,
		userType: user.userType || (user.role === 'receptionist' ? 'receptionist' : 'hospital')
	};
	
	return jwt.sign(payload, JWT_SECRET, { 
		expiresIn: JWT_EXPIRES_IN,
		issuer: 'hospital-meals-system',
		audience: 'hospital-staff'
	});
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
	try {
		return jwt.verify(token, JWT_SECRET, {
			issuer: 'hospital-meals-system',
			audience: 'hospital-staff'
		});
	} catch (error) {
		return null;
	}
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
function extractTokenFromHeader(authHeader) {
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}
	return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * JWT Authentication Middleware for API routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function jwtAuthMiddleware(req, res, next) {
	const authHeader = req.headers.authorization;
	const token = extractTokenFromHeader(authHeader);
	
	if (!token) {
		return res.status(401).json({ 
			error: 'Access denied. No token provided.',
			code: 'NO_TOKEN'
		});
	}
	
	const decoded = verifyToken(token);
	if (!decoded) {
		return res.status(401).json({ 
			error: 'Invalid or expired token.',
			code: 'INVALID_TOKEN'
		});
	}
	
	// Add user info to request object
	req.user = decoded;
	next();
}

/**
 * JWT Role-based Authorization Middleware
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
function jwtRequireRole(allowedRoles) {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ 
				error: 'Authentication required.',
				code: 'AUTH_REQUIRED'
			});
		}
		
		if (!allowedRoles.includes(req.user.role)) {
			return res.status(403).json({ 
				error: 'Insufficient permissions.',
				code: 'INSUFFICIENT_PERMISSIONS',
				required: allowedRoles,
				userRole: req.user.role
			});
		}
		
		next();
	};
}

/**
 * Refresh JWT token
 * @param {string} token - Current JWT token
 * @returns {Object} New token and user info
 */
function refreshToken(token) {
	const decoded = verifyToken(token);
	if (!decoded) {
		throw new Error('Invalid token');
	}
	
	// Get fresh user data from database
	const user = getUserByUsername(decoded.username);
	if (!user) {
		throw new Error('User not found');
	}
	
	const newToken = generateToken({
		id: user.id,
		username: user.username,
		role: user.role,
		full_name: user.full_name,
		userType: decoded.userType
	});
	
	return {
		token: newToken,
		user: {
			id: user.id,
			username: user.username,
			role: user.role,
			full_name: user.full_name,
			userType: decoded.userType
		}
	};
}

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null if invalid
 */
function getTokenExpiration(token) {
	try {
		const decoded = jwt.decode(token);
		return decoded ? new Date(decoded.exp * 1000) : null;
	} catch (error) {
		return null;
	}
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */
function isTokenExpired(token) {
	const expiration = getTokenExpiration(token);
	if (!expiration) return true;
	return new Date() > expiration;
}

/**
 * Advanced Role-based Authorization Middleware
 * Supports hierarchical permissions and resource-based access
 */
function createRoleMiddleware(permissions) {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ 
				error: 'Authentication required.',
				code: 'AUTH_REQUIRED'
			});
		}

		const userRole = req.user.role;
		const resource = req.params.resource || req.route?.path || 'default';
		const action = req.method.toLowerCase();

		// Check if user has permission for this action on this resource
		const hasPermission = checkPermission(userRole, resource, action, permissions);
		
		if (!hasPermission) {
			return res.status(403).json({ 
				error: 'Insufficient permissions for this action.',
				code: 'INSUFFICIENT_PERMISSIONS',
				required: `${action}:${resource}`,
				userRole: userRole
			});
		}

		next();
	};
}

/**
 * Check if user has specific permission
 */
function checkPermission(userRole, resource, action, permissions) {
	// Admin has all permissions
	if (userRole === 'admin') return true;

	// Check role-specific permissions
	const rolePermissions = permissions[userRole];
	if (!rolePermissions) return false;

	// Check resource-specific permissions
	const resourcePermissions = rolePermissions[resource];
	if (!resourcePermissions) return false;

	// Check action permissions
	return resourcePermissions.includes(action) || resourcePermissions.includes('*');
}

/**
 * Session Management Middleware
 * Handles session validation and refresh
 */
function sessionManagementMiddleware(req, res, next) {
	// Check if session exists and is valid
	if (req.session && req.session.user) {
		// Validate session timestamp (8 hours max)
		const sessionAge = Date.now() - (req.session.timestamp || 0);
		const maxAge = 8 * 60 * 60 * 1000; // 8 hours

		if (sessionAge > maxAge) {
			req.session.destroy();
			return res.status(401).json({
				error: 'Session expired',
				code: 'SESSION_EXPIRED'
			});
		}

		// Update session timestamp
		req.session.timestamp = Date.now();
	}

	next();
}

/**
 * Rate Limiting Middleware
 * Prevents abuse of authentication endpoints
 */
function createRateLimitMiddleware(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
	const attempts = new Map();

	return (req, res, next) => {
		const clientId = req.ip || req.connection.remoteAddress;
		const now = Date.now();
		
		// Clean old attempts
		if (attempts.has(clientId)) {
			const clientAttempts = attempts.get(clientId);
			clientAttempts.timestamps = clientAttempts.timestamps.filter(
				timestamp => now - timestamp < windowMs
			);
			
			if (clientAttempts.timestamps.length === 0) {
				attempts.delete(clientId);
			}
		}

		// Check current attempts
		if (!attempts.has(clientId)) {
			attempts.set(clientId, { timestamps: [] });
		}

		const clientAttempts = attempts.get(clientId);
		
		if (clientAttempts.timestamps.length >= maxAttempts) {
			return res.status(429).json({
				error: 'Too many authentication attempts',
				code: 'RATE_LIMITED',
				retryAfter: Math.ceil(windowMs / 1000)
			});
		}

		// Add current attempt
		clientAttempts.timestamps.push(now);
		
		next();
	};
}

/**
 * Multi-Factor Authentication Support
 */
function generateMFAToken(userId) {
	const mfaToken = jwt.sign(
		{ userId, type: 'mfa' },
		JWT_SECRET,
		{ expiresIn: '5m' }
	);
	return mfaToken;
}

function verifyMFAToken(token) {
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		return decoded.type === 'mfa' ? decoded : null;
	} catch (error) {
		return null;
	}
}

/**
 * Device Management
 */
function generateDeviceToken(userId, deviceInfo) {
	const deviceToken = jwt.sign(
		{ 
			userId, 
			type: 'device',
			deviceInfo: {
				userAgent: deviceInfo.userAgent,
				ip: deviceInfo.ip,
				timestamp: Date.now()
			}
		},
		JWT_SECRET,
		{ expiresIn: '30d' }
	);
	return deviceToken;
}

/**
 * Audit Logging for Authentication Events
 * Note: Audit logging is handled in server.js routes directly
 */
function logAuthEvent(event, userId, details, ip) {
	// Logging handled at route level in server.js
	// This function is kept for backward compatibility
}

/**
 * Enhanced Token Validation with Blacklist Support
 */
const tokenBlacklist = new Set();

function blacklistToken(token) {
	tokenBlacklist.add(token);
	// Auto-remove after token expiration
	setTimeout(() => {
		tokenBlacklist.delete(token);
	}, 24 * 60 * 60 * 1000); // 24 hours
}

function isTokenBlacklisted(token) {
	return tokenBlacklist.has(token);
}

/**
 * Enhanced JWT Middleware with Blacklist Check
 */
function enhancedJwtAuthMiddleware(req, res, next) {
	const authHeader = req.headers.authorization;
	const token = extractTokenFromHeader(authHeader);
	
	if (!token) {
		return res.status(401).json({ 
			error: 'Access denied. No token provided.',
			code: 'NO_TOKEN'
		});
	}

	// Check if token is blacklisted
	if (isTokenBlacklisted(token)) {
		return res.status(401).json({ 
			error: 'Token has been revoked.',
			code: 'TOKEN_REVOKED'
		});
	}
	
	const decoded = verifyToken(token);
	if (!decoded) {
		return res.status(401).json({ 
			error: 'Invalid or expired token.',
			code: 'INVALID_TOKEN'
		});
	}
	
	// Add user info to request object
	req.user = decoded;
	req.token = token;
	next();
}

module.exports = {
	generateToken,
	verifyToken,
	extractTokenFromHeader,
	jwtAuthMiddleware,
	enhancedJwtAuthMiddleware,
	jwtRequireRole,
	createRoleMiddleware,
	sessionManagementMiddleware,
	createRateLimitMiddleware,
	refreshToken,
	getTokenExpiration,
	isTokenExpired,
	generateMFAToken,
	verifyMFAToken,
	generateDeviceToken,
	logAuthEvent,
	blacklistToken,
	isTokenBlacklisted,
	JWT_SECRET,
	JWT_EXPIRES_IN
};








