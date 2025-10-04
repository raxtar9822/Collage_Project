import React from 'react';
import styles from './OrderCard.module.css';
import AnimatedProgress from '../AnimatedProgress/AnimatedProgress';
import PriorityTag from '../PriorityTag/PriorityTag';

interface OrderCardProps {
    orderId: string;
    patientName: string;
    meal: string;
    status: 'pending' | 'in-progress' | 'delivered';
    priority: 'urgent' | 'dietary-restriction' | 'normal';
    estimatedDeliveryTime: number; // in minutes
}

const OrderCard: React.FC<OrderCardProps> = ({ orderId, patientName, meal, status, priority, estimatedDeliveryTime }) => {
    const getStatusClass = () => {
        switch (status) {
            case 'pending':
                return styles.pending;
            case 'in-progress':
                return styles.inProgress;
            case 'delivered':
                return styles.delivered;
            default:
                return '';
        }
    };

    return (
        <div className={`${styles.orderCard} ${getStatusClass()}`}>
            <div className={styles.header}>
                <h3>Order ID: {orderId}</h3>
                <PriorityTag priority={priority} />
            </div>
            <div className={styles.body}>
                <p><strong>Patient:</strong> {patientName}</p>
                <p><strong>Meal:</strong> {meal}</p>
                <p><strong>Estimated Delivery Time:</strong> {estimatedDeliveryTime} mins</p>
            </div>
            <AnimatedProgress status={status} />
        </div>
    );
};

export default OrderCard;