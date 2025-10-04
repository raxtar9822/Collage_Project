import { useEffect, useState } from 'react';
import { fetchOrders } from '../services/api';
import { Order } from '../types';

const useRealtime = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await fetchOrders();
                setOrders(data);
            } catch (err) {
                setError('Failed to fetch orders');
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        const interval = setInterval(() => {
            fetchData();
        }, 5000); // Fetch data every 5 seconds

        return () => clearInterval(interval);
    }, []);

    return { orders, loading, error };
};

export default useRealtime;