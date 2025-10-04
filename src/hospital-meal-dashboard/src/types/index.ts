export interface Order {
    id: string;
    patientName: string;
    mealItems: string[];
    status: 'pending' | 'in-progress' | 'delivered';
    priority: 'normal' | 'urgent' | 'dietary-restriction';
    deliveryTime: Date;
}

export interface DeliveryPersonnel {
    id: string;
    name: string;
    location: {
        latitude: number;
        longitude: number;
    };
    status: 'available' | 'on-delivery';
}

export interface Stats {
    pendingOrders: number;
    completedDeliveries: number;
    averageDeliveryTime: number; // in minutes
}