import React from 'react';
import './AnimatedProgress.module.css';

interface AnimatedProgressProps {
    status: 'kitchen' | 'out-for-delivery' | 'delivered';
}

const AnimatedProgress: React.FC<AnimatedProgressProps> = ({ status }) => {
    const getStatusClass = () => {
        switch (status) {
            case 'kitchen':
                return 'progress-kitchen';
            case 'out-for-delivery':
                return 'progress-delivery';
            case 'delivered':
                return 'progress-delivered';
            default:
                return '';
        }
    };

    return (
        <div className={`animated-progress ${getStatusClass()}`}>
            <div className="progress-indicator" />
            <div className="progress-label">
                {status === 'kitchen' && 'Preparing...'}
                {status === 'out-for-delivery' && 'On the way!'}
                {status === 'delivered' && 'Delivered!'}
            </div>
        </div>
    );
};

export default AnimatedProgress;