import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api'; // Update with your API base URL

// Fetch all orders
export const fetchOrders = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/orders`);
        return response.data;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
};

// Fetch order by ID
export const fetchOrderById = async (orderId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching order with ID ${orderId}:`, error);
        throw error;
    }
};

// Fetch delivery personnel locations
export const fetchDeliveryPersonnelLocations = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/delivery/locations`);
        return response.data;
    } catch (error) {
        console.error('Error fetching delivery personnel locations:', error);
        throw error;
    }
};

// Fetch real-time statistics
export const fetchStatistics = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/statistics`);
        return response.data;
    } catch (error) {
        console.error('Error fetching statistics:', error);
        throw error;
    }
};