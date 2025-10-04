/**
 * Real-time Client for Hospital Meal System
 * Handles WebSocket connections, authentication, and real-time updates
 */
class RealtimeClient {
	constructor() {
		this.socket = null;
		this.isAuthenticated = false;
		this.user = null;
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 5;
		this.reconnectDelay = 1000;
		this.eventHandlers = new Map();
		
		this.init();
	}

	/**
	 * Initialize the real-time client
	 */
	init() {
		this.connect();
		this.setupEventListeners();
		this.setupHeartbeat();
	}

	/**
	 * Connect to WebSocket server
	 */
	connect() {
		try {
			this.socket = io();
			
			this.socket.on('connect', () => {
				console.log('🔌 Connected to real-time server');
				this.reconnectAttempts = 0;
				this.authenticate();
			});

			this.socket.on('disconnect', () => {
				console.log('❌ Disconnected from real-time server');
				this.isAuthenticated = false;
				this.handleReconnection();
			});

			this.socket.on('connect_error', (error) => {
				console.error('❌ Connection error:', error);
				this.handleReconnection();
			});

			this.setupSocketEventHandlers();
			
		} catch (error) {
			console.error('❌ Failed to initialize WebSocket:', error);
		}
	}

	/**
	 * Setup socket event handlers
	 */
	setupSocketEventHandlers() {
		// Authentication events
		this.socket.on('auth-success', (data) => {
			this.isAuthenticated = true;
			this.user = data.user;
			console.log('✅ Real-time authentication successful:', this.user.username);
			this.emit('authenticated', data);
		});

		this.socket.on('auth-error', (error) => {
			console.error('❌ Real-time authentication failed:', error);
			this.emit('auth-error', error);
		});

		// Order events
		this.socket.on('order-created', (data) => {
			console.log('📦 New order created:', data.order.id);
			this.emit('order-created', data);
			this.showNotification('New Order', `Order #${data.order.id} has been created`, 'info');
		});

		this.socket.on('order-status-updated', (data) => {
			console.log('📦 Order status updated:', data.orderId, 'to', data.status);
			this.emit('order-status-updated', data);
			this.showNotification('Order Update', `Order #${data.orderId} is now ${data.status}`, 'success');
		});

		this.socket.on('order-cancelled', (data) => {
			console.log('❌ Order cancelled:', data.orderId);
			this.emit('order-cancelled', data);
			this.showNotification('Order Cancelled', `Order #${data.orderId} has been cancelled`, 'warning');
		});

		// Role-specific events
		this.socket.on('new-order-kitchen', (order) => {
			console.log('🍳 New order for kitchen:', order.id);
			this.emit('new-order-kitchen', order);
			this.showNotification('Kitchen Alert', `New order #${order.id} ready for preparation`, 'info');
		});

		this.socket.on('order-ready-delivery', (order) => {
			console.log('🚚 Order ready for delivery:', order.id);
			this.emit('order-ready-delivery', order);
			this.showNotification('Delivery Alert', `Order #${order.id} is ready for delivery`, 'info');
		});

		this.socket.on('order-delivered', (order) => {
			console.log('✅ Order delivered:', order.id);
			this.emit('order-delivered', order);
			this.showNotification('Delivery Complete', `Order #${order.id} has been delivered`, 'success');
		});

		// Emergency notifications
		this.socket.on('emergency-notification', (notification) => {
			console.log('🚨 Emergency notification:', notification.message);
			this.emit('emergency-notification', notification);
			this.showEmergencyNotification(notification);
		});

		this.socket.on('admin-alert', (notification) => {
			console.log('🔔 Admin alert:', notification.message);
			this.emit('admin-alert', notification);
			this.showAdminAlert(notification);
		});

		// System notifications
		this.socket.on('system-notification', (notification) => {
			console.log('📢 System notification:', notification.message);
			this.emit('system-notification', notification);
			this.showNotification('System Message', notification.message, notification.type);
		});

		// User presence events
		this.socket.on('user-connected', (user) => {
			console.log('👤 User connected:', user.username);
			this.emit('user-connected', user);
		});

		this.socket.on('user-disconnected', (user) => {
			console.log('👤 User disconnected:', user.username);
			this.emit('user-disconnected', user);
		});

		// Delivery location updates
		this.socket.on('delivery-location-updated', (data) => {
			console.log('📍 Delivery location updated:', data.deliveryPerson.username);
			this.emit('delivery-location-updated', data);
		});

		// Typing indicators
		this.socket.on('user-typing-start', (data) => {
			this.emit('user-typing-start', data);
		});

		this.socket.on('user-typing-stop', (data) => {
			this.emit('user-typing-stop', data);
		});

		// Room events
		this.socket.on('room-joined', (data) => {
			console.log('🏠 Joined room:', data.room);
			this.emit('room-joined', data);
		});

		this.socket.on('error', (error) => {
			console.error('❌ Socket error:', error);
			this.emit('error', error);
		});
	}

	/**
	 * Authenticate with the server
	 */
	authenticate() {
		const token = this.getAuthToken();
		if (token) {
			this.socket.emit('authenticate', { token });
		} else {
			console.warn('⚠️ No authentication token found');
		}
	}

	/**
	 * Get authentication token from localStorage or session
	 */
	getAuthToken() {
		// Try to get token from localStorage first
		let token = localStorage.getItem('auth_token');
		
		// If not found, try to get from session storage
		if (!token) {
			token = sessionStorage.getItem('auth_token');
		}
		
		// If still not found, try to get from meta tag (for web views)
		if (!token) {
			const metaToken = document.querySelector('meta[name="auth-token"]');
			if (metaToken) {
				token = metaToken.getAttribute('content');
			}
		}
		
		return token;
	}

	/**
	 * Join a specific room
	 */
	joinRoom(roomName) {
		if (this.socket && this.isAuthenticated) {
			this.socket.emit('join-room', roomName);
		}
	}

	/**
	 * Send order status update
	 */
	updateOrderStatus(orderId, status, notes = '') {
		if (this.socket && this.isAuthenticated) {
			this.socket.emit('order-status-update', {
				orderId,
				status,
				notes
			});
		}
	}

	/**
	 * Send delivery location update
	 */
	updateDeliveryLocation(latitude, longitude, orderId, status) {
		if (this.socket && this.isAuthenticated) {
			this.socket.emit('delivery-location-update', {
				latitude,
				longitude,
				orderId,
				status
			});
		}
	}

	/**
	 * Send emergency notification
	 */
	sendEmergencyNotification(type, message, priority = 'high', orderId = null) {
		if (this.socket && this.isAuthenticated) {
			this.socket.emit('emergency-notification', {
				type,
				message,
				priority,
				orderId
			});
		}
	}

	/**
	 * Start typing indicator
	 */
	startTyping(room, orderId) {
		if (this.socket && this.isAuthenticated) {
			this.socket.emit('typing-start', { room, orderId });
		}
	}

	/**
	 * Stop typing indicator
	 */
	stopTyping(room, orderId) {
		if (this.socket && this.isAuthenticated) {
			this.socket.emit('typing-stop', { room, orderId });
		}
	}

	/**
	 * Handle reconnection logic
	 */
	handleReconnection() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
			
			console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
			
			setTimeout(() => {
				this.connect();
			}, delay);
		} else {
			console.error('❌ Max reconnection attempts reached');
			this.emit('max-reconnect-attempts-reached');
		}
	}

	/**
	 * Setup heartbeat to keep connection alive
	 */
	setupHeartbeat() {
		setInterval(() => {
			if (this.socket && this.socket.connected) {
				this.socket.emit('ping');
			}
		}, 30000); // Send ping every 30 seconds
	}

	/**
	 * Setup DOM event listeners
	 */
	setupEventListeners() {
		// Handle page visibility changes
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				// Page is hidden, reduce activity
				console.log('📱 Page hidden, reducing real-time activity');
			} else {
				// Page is visible, resume full activity
				console.log('📱 Page visible, resuming real-time activity');
				if (this.socket && !this.socket.connected) {
					this.connect();
				}
			}
		});

		// Handle online/offline events
		window.addEventListener('online', () => {
			console.log('🌐 Network online, attempting to reconnect');
			if (!this.socket || !this.socket.connected) {
				this.connect();
			}
		});

		window.addEventListener('offline', () => {
			console.log('🌐 Network offline');
			this.emit('network-offline');
		});
	}

	/**
	 * Show notification to user
	 */
	showNotification(title, message, type = 'info') {
		// Check if browser supports notifications
		if ('Notification' in window && Notification.permission === 'granted') {
			const notification = new Notification(title, {
				body: message,
				icon: '/public/images/icon-192.png',
				tag: 'hospital-meal-notification'
			});

			notification.onclick = () => {
				window.focus();
				notification.close();
			};

			// Auto-close after 5 seconds
			setTimeout(() => {
				notification.close();
			}, 5000);
		}

		// Also show in-page notification
		this.showInPageNotification(title, message, type);
	}

	/**
	 * Show emergency notification with special styling
	 */
	showEmergencyNotification(notification) {
		// Play emergency sound if available
		this.playEmergencySound();
		
		// Show urgent notification
		this.showNotification('🚨 EMERGENCY', notification.message, 'error');
		
		// Show modal if critical
		if (notification.priority === 'critical') {
			this.showEmergencyModal(notification);
		}
	}

	/**
	 * Show admin alert
	 */
	showAdminAlert(notification) {
		this.showNotification('🔔 Admin Alert', notification.message, 'warning');
	}

	/**
	 * Show in-page notification
	 */
	showInPageNotification(title, message, type) {
		// Create notification element
		const notification = document.createElement('div');
		notification.className = `notification notification-${type}`;
		notification.innerHTML = `
			<div class="notification-content">
				<h4>${title}</h4>
				<p>${message}</p>
			</div>
			<button class="notification-close">&times;</button>
		`;

		// Add to page
		let container = document.getElementById('notification-container');
		if (!container) {
			container = document.createElement('div');
			container.id = 'notification-container';
			container.className = 'notification-container';
			document.body.appendChild(container);
		}

		container.appendChild(notification);

		// Auto-remove after 5 seconds
		setTimeout(() => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, 5000);

		// Handle close button
		notification.querySelector('.notification-close').addEventListener('click', () => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		});
	}

	/**
	 * Show emergency modal
	 */
	showEmergencyModal(notification) {
		const modal = document.createElement('div');
		modal.className = 'emergency-modal';
		modal.innerHTML = `
			<div class="emergency-modal-content">
				<div class="emergency-header">
					<h2>🚨 EMERGENCY ALERT</h2>
				</div>
				<div class="emergency-body">
					<p>${notification.message}</p>
					<p><strong>From:</strong> ${notification.sender.fullName} (${notification.sender.role})</p>
					<p><strong>Time:</strong> ${new Date(notification.timestamp).toLocaleString()}</p>
				</div>
				<div class="emergency-footer">
					<button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">Acknowledge</button>
				</div>
			</div>
		`;

		document.body.appendChild(modal);
	}

	/**
	 * Play emergency sound
	 */
	playEmergencySound() {
		try {
			const audio = new Audio('/public/sounds/emergency.mp3');
			audio.play().catch(e => console.log('Could not play emergency sound:', e));
		} catch (error) {
			console.log('Emergency sound not available');
		}
	}

	/**
	 * Event emitter functionality
	 */
	on(event, handler) {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, []);
		}
		this.eventHandlers.get(event).push(handler);
	}

	off(event, handler) {
		if (this.eventHandlers.has(event)) {
			const handlers = this.eventHandlers.get(event);
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	}

	emit(event, data) {
		if (this.eventHandlers.has(event)) {
			this.eventHandlers.get(event).forEach(handler => {
				try {
					handler(data);
				} catch (error) {
					console.error('Error in event handler:', error);
				}
			});
		}
	}

	/**
	 * Get connection status
	 */
	getStatus() {
		return {
			connected: this.socket ? this.socket.connected : false,
			authenticated: this.isAuthenticated,
			user: this.user,
			reconnectAttempts: this.reconnectAttempts
		};
	}

	/**
	 * Disconnect from server
	 */
	disconnect() {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
			this.isAuthenticated = false;
			this.user = null;
		}
	}
}

// Initialize real-time client when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	// Request notification permission
	if ('Notification' in window && Notification.permission === 'default') {
		Notification.requestPermission();
	}

	// Initialize real-time client
	window.realtimeClient = new RealtimeClient();

	// Make it globally available
	window.RealtimeClient = RealtimeClient;
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
	module.exports = RealtimeClient;
}
