import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3000'; // Update with your server URL
const socket = io(SOCKET_SERVER_URL);

export const subscribeToOrderUpdates = (callback) => {
    socket.on('orderUpdate', (data) => {
        callback(data);
    });
};

export const subscribeToDeliveryUpdates = (callback) => {
    socket.on('deliveryUpdate', (data) => {
        callback(data);
    });
};

export const disconnectSocket = () => {
    socket.disconnect();
};