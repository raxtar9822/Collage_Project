import React from 'react';
import './StatsCard.module.css';

interface StatsCardProps {
  pendingOrders: number;
  completedDeliveries: number;
  averageDeliveryTime: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ pendingOrders, completedDeliveries, averageDeliveryTime }) => {
  return (
    <div className="stats-card">
      <div className="stat">
        <h3>Pending Orders</h3>
        <p>{pendingOrders}</p>
      </div>
      <div className="stat">
        <h3>Completed Deliveries</h3>
        <p>{completedDeliveries}</p>
      </div>
      <div className="stat">
        <h3>Average Delivery Time</h3>
        <p>{averageDeliveryTime}</p>
      </div>
    </div>
  );
};

export default StatsCard;