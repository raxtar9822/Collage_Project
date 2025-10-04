import React from 'react';
import OrderCard from '../components/OrderCard/OrderCard';
import StatsCard from '../components/StatsCard/StatsCard';
import MiniMap from '../components/MiniMap/MiniMap';
import { useRealtime } from '../hooks/useRealtime';
import './Dashboard.module.css';

const Dashboard = () => {
    const { orders, stats } = useRealtime();

    return (
        <div className="dashboard-container">
            <h1 className="dashboard-title">Hospital Meal Tracking Dashboard</h1>
            <div className="stats-section">
                <StatsCard 
                    pendingOrders={stats.pendingOrders} 
                    completedDeliveries={stats.completedDeliveries} 
                    averageDeliveryTime={stats.averageDeliveryTime} 
                />
            </div>
            <div className="order-cards-section">
                {orders.map(order => (
                    <OrderCard key={order.id} order={order} />
                ))}
            </div>
            <div className="mini-map-section">
                <MiniMap />
            </div>
        </div>
    );
};

export default Dashboard;