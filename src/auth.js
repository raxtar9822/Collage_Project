const jwt = require('jsonwebtoken');
const { getUserByUsername } = require('./db');

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

module.exports = {
	generateToken,
	verifyToken,
	extractTokenFromHeader,
	jwtAuthMiddleware,
	jwtRequireRole,
	refreshToken,
	getTokenExpiration,
	isTokenExpired,
	JWT_SECRET,
	JWT_EXPIRES_IN
};





