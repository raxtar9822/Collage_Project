export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

export const formatDate = (date: string | Date): string => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(date));
};

export const formatTime = (time: string | Date): string => {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    }).format(new Date(time));
};

export const formatOrderStatus = (status: string): string => {
    switch (status) {
        case 'pending':
            return 'Pending';
        case 'in_progress':
            return 'In Progress';
        case 'delivered':
            return 'Delivered';
        default:
            return 'Unknown Status';
    }
};