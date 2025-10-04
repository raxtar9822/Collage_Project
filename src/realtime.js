const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('./auth');
const { logAudit } = require('./db');

/**
 * Real-time WebSocket Manager for Hospital Meal System
 * Handles room-based communication, authentication, and event broadcasting
 */
class RealtimeManager {
	constructor(server) {
		this.io = new Server(server, {
			cors: {
				origin: "*",
				methods: ["GET", "POST"]
			},
			transports: ['websocket', 'polling']
		});
		
		this.rooms = {
			admin: 'admin-room',
			nurse: 'nurse-room', 
			kitchen: 'kitchen-room',
			delivery: 'delivery-room',
			receptionist: 'receptionist-room',
			orders: 'orders-room',
			notifications: 'notifications-room'
		};
		
		this.connectedUsers = new Map();
		this.setupEventHandlers();
	}

	/**
	 * Setup Socket.IO event handlers
	 */
	setupEventHandlers() {
		this.io.on('connection', (socket) => {
			console.log(`🔌 Client connected: ${socket.id}`);

			// Handle authentication
			socket.on('authenticate', (data) => {
				this.handleAuthentication(socket, data);
			});

			// Handle joining role-based rooms
			socket.on('join-room', (roomName) => {
				this.handleJoinRoom(socket, roomName);
			});

			// Handle order status updates
			socket.on('order-status-update', (data) => {
				this.handleOrderStatusUpdate(socket, data);
			});

			// Handle delivery location updates
			socket.on('delivery-location-update', (data) => {
				this.handleDeliveryLocationUpdate(socket, data);
			});

			// Handle emergency notifications
			socket.on('emergency-notification', (data) => {
				this.handleEmergencyNotification(socket, data);
			});

			// Handle typing indicators
			socket.on('typing-start', (data) => {
				this.handleTypingStart(socket, data);
			});

			socket.on('typing-stop', (data) => {
				this.handleTypingStop(socket, data);
			});

			// Handle disconnection
			socket.on('disconnect', () => {
				this.handleDisconnection(socket);
			});

			// Handle errors
			socket.on('error', (error) => {
				console.error(`Socket error for ${socket.id}:`, error);
			});
		});
	}

	/**
	 * Handle socket authentication
	 */
	handleAuthentication(socket, data) {
		try {
			const { token } = data;
			if (!token) {
				socket.emit('auth-error', { message: 'No token provided' });
				return;
			}

			const decoded = verifyToken(token);
			if (!decoded) {
				socket.emit('auth-error', { message: 'Invalid token' });
				return;
			}

			// Store user info in socket
			socket.user = decoded;
			socket.authenticated = true;

			// Store in connected users map
			this.connectedUsers.set(socket.id, {
				userId: decoded.id,
				username: decoded.username,
				role: decoded.role,
				fullName: decoded.full_name,
				connectedAt: new Date(),
				socketId: socket.id
			});

			// Join role-based room
			const roomName = this.rooms[decoded.role] || this.rooms.notifications;
			socket.join(roomName);

			// Join general rooms
			socket.join(this.rooms.orders);
			socket.join(this.rooms.notifications);

			socket.emit('auth-success', {
				user: decoded,
				rooms: [roomName, this.rooms.orders, this.rooms.notifications]
			});

			// Notify others in the room about new connection
			socket.to(roomName).emit('user-connected', {
				userId: decoded.id,
				username: decoded.username,
				role: decoded.role,
				fullName: decoded.full_name
			});

			console.log(`✅ User authenticated: ${decoded.username} (${decoded.role})`);
			
			// Log authentication
			logAudit('realtime', decoded.id, 'socket_authenticated', JSON.stringify({ socketId: socket.id }), decoded.id);

		} catch (error) {
			console.error('Authentication error:', error);
			socket.emit('auth-error', { message: 'Authentication failed' });
		}
	}

	/**
	 * Handle joining specific rooms
	 */
	handleJoinRoom(socket, roomName) {
		if (!socket.authenticated) {
			socket.emit('error', { message: 'Authentication required' });
			return;
		}

		// Validate room access based on user role
		if (!this.canJoinRoom(socket.user.role, roomName)) {
			socket.emit('error', { message: 'Insufficient permissions to join this room' });
			return;
		}

		socket.join(roomName);
		socket.emit('room-joined', { room: roomName });
		
		console.log(`🏠 User ${socket.user.username} joined room: ${roomName}`);
	}

	/**
	 * Check if user can join a specific room
	 */
	canJoinRoom(userRole, roomName) {
		const rolePermissions = {
			admin: ['admin-room', 'orders-room', 'notifications-room', 'kitchen-room', 'delivery-room', 'nurse-room', 'receptionist-room'],
			nurse: ['nurse-room', 'orders-room', 'notifications-room'],
			kitchen: ['kitchen-room', 'orders-room', 'notifications-room'],
			delivery: ['delivery-room', 'orders-room', 'notifications-room'],
			receptionist: ['receptionist-room', 'orders-room', 'notifications-room']
		};

		return rolePermissions[userRole]?.includes(roomName) || false;
	}

	/**
	 * Handle order status updates
	 */
	handleOrderStatusUpdate(socket, data) {
		if (!socket.authenticated) {
			socket.emit('error', { message: 'Authentication required' });
			return;
		}

		const { orderId, status, notes } = data;
		
		// Validate user can update orders
		if (!['kitchen', 'delivery', 'admin'].includes(socket.user.role)) {
			socket.emit('error', { message: 'Insufficient permissions' });
			return;
		}

		// Broadcast to relevant rooms
		const updateData = {
			orderId,
			status,
			notes,
			updatedBy: {
				id: socket.user.id,
				username: socket.user.username,
				role: socket.user.role,
				fullName: socket.user.full_name
			},
			timestamp: new Date().toISOString()
		};

		// Broadcast to orders room
		this.io.to(this.rooms.orders).emit('order-updated', updateData);
		
		// Broadcast to specific role rooms based on status
		if (status === 'in_kitchen') {
			this.io.to(this.rooms.kitchen).emit('order-assigned-kitchen', updateData);
		} else if (status === 'out_for_delivery') {
			this.io.to(this.rooms.delivery).emit('order-ready-delivery', updateData);
		} else if (status === 'delivered') {
			this.io.to(this.rooms.nurse).emit('order-delivered', updateData);
		}

		console.log(`📦 Order ${orderId} status updated to ${status} by ${socket.user.username}`);
		
		// Log the update
		logAudit('realtime', socket.user.id, 'order_status_update', JSON.stringify(updateData), socket.user.id);
	}

	/**
	 * Handle delivery location updates
	 */
	handleDeliveryLocationUpdate(socket, data) {
		if (!socket.authenticated || socket.user.role !== 'delivery') {
			socket.emit('error', { message: 'Only delivery personnel can update location' });
			return;
		}

		const { latitude, longitude, orderId, status } = data;
		
		const locationData = {
			deliveryPerson: {
				id: socket.user.id,
				username: socket.user.username,
				fullName: socket.user.full_name
			},
			location: { latitude, longitude },
			orderId,
			status,
			timestamp: new Date().toISOString()
		};

		// Broadcast to admin and nurse rooms for tracking
		this.io.to(this.rooms.admin).emit('delivery-location-updated', locationData);
		this.io.to(this.rooms.nurse).emit('delivery-location-updated', locationData);
		
		console.log(`📍 Delivery location updated by ${socket.user.username}`);
	}

	/**
	 * Handle emergency notifications
	 */
	handleEmergencyNotification(socket, data) {
		if (!socket.authenticated) {
			socket.emit('error', { message: 'Authentication required' });
			return;
		}

		const { type, message, priority, orderId } = data;
		
		const notification = {
			id: Date.now(),
			type,
			message,
			priority: priority || 'medium',
			orderId,
			sender: {
				id: socket.user.id,
				username: socket.user.username,
				role: socket.user.role,
				fullName: socket.user.full_name
			},
			timestamp: new Date().toISOString()
		};

		// Broadcast to all connected users
		this.io.emit('emergency-notification', notification);
		
		// Also send to admin room specifically
		this.io.to(this.rooms.admin).emit('admin-alert', notification);
		
		console.log(`🚨 Emergency notification from ${socket.user.username}: ${message}`);
		
		// Log emergency notification
		logAudit('realtime', socket.user.id, 'emergency_notification', JSON.stringify(notification), socket.user.id);
	}

	/**
	 * Handle typing indicators
	 */
	handleTypingStart(socket, data) {
		if (!socket.authenticated) return;
		
		const { room, orderId } = data;
		socket.to(room).emit('user-typing-start', {
			userId: socket.user.id,
			username: socket.user.username,
			orderId
		});
	}

	handleTypingStop(socket, data) {
		if (!socket.authenticated) return;
		
		const { room, orderId } = data;
		socket.to(room).emit('user-typing-stop', {
			userId: socket.user.id,
			username: socket.user.username,
			orderId
		});
	}

	/**
	 * Handle disconnection
	 */
	handleDisconnection(socket) {
		if (socket.user) {
			const userInfo = this.connectedUsers.get(socket.id);
			if (userInfo) {
				// Notify others in the room about disconnection
				const roomName = this.rooms[socket.user.role] || this.rooms.notifications;
				socket.to(roomName).emit('user-disconnected', {
					userId: socket.user.id,
					username: socket.user.username,
					role: socket.user.role,
					fullName: socket.user.full_name
				});

				console.log(`❌ User disconnected: ${socket.user.username} (${socket.user.role})`);
				
				// Log disconnection
				logAudit('realtime', socket.user.id, 'socket_disconnected', JSON.stringify({ socketId: socket.id }), socket.user.id);
			}
			
			this.connectedUsers.delete(socket.id);
		}
	}

	/**
	 * Broadcast order creation
	 */
	broadcastOrderCreated(order) {
		this.io.to(this.rooms.orders).emit('order-created', {
			order,
			timestamp: new Date().toISOString()
		});
		
		// Notify kitchen specifically
		this.io.to(this.rooms.kitchen).emit('new-order-kitchen', order);
	}

	/**
	 * Broadcast order cancellation
	 */
	broadcastOrderCancelled(orderId, reason, cancelledBy) {
		this.io.to(this.rooms.orders).emit('order-cancelled', {
			orderId,
			reason,
			cancelledBy,
			timestamp: new Date().toISOString()
		});
	}

	/**
	 * Broadcast system-wide notification
	 */
	broadcastSystemNotification(message, type = 'info', targetRoles = []) {
		const notification = {
			id: Date.now(),
			message,
			type,
			timestamp: new Date().toISOString()
		};

		if (targetRoles.length === 0) {
			// Broadcast to all users
			this.io.emit('system-notification', notification);
		} else {
			// Broadcast to specific role rooms
			targetRoles.forEach(role => {
				const roomName = this.rooms[role];
				if (roomName) {
					this.io.to(roomName).emit('system-notification', notification);
				}
			});
		}
	}

	/**
	 * Get connected users count by role
	 */
	getConnectedUsersCount() {
		const counts = {};
		this.connectedUsers.forEach(user => {
			counts[user.role] = (counts[user.role] || 0) + 1;
		});
		return counts;
	}

	/**
	 * Get all connected users
	 */
	getConnectedUsers() {
		return Array.from(this.connectedUsers.values());
	}

	/**
	 * Send private message to specific user
	 */
	sendPrivateMessage(userId, message) {
		this.connectedUsers.forEach((user, socketId) => {
			if (user.userId === userId) {
				this.io.to(socketId).emit('private-message', {
					message,
					timestamp: new Date().toISOString()
				});
			}
		});
	}
}

module.exports = RealtimeManager;
