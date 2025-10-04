import React from 'react';
import styles from './PriorityTag.module.css';

interface PriorityTagProps {
    priority: 'urgent' | 'dietary';
}

const PriorityTag: React.FC<PriorityTagProps> = ({ priority }) => {
    const getTagStyle = () => {
        switch (priority) {
            case 'urgent':
                return styles.urgent;
            case 'dietary':
                return styles.dietary;
            default:
                return '';
        }
    };

    return (
        <div className={`${styles.priorityTag} ${getTagStyle()}`}>
            {priority === 'urgent' ? 'Urgent' : 'Dietary Restriction'}
        </div>
    );
};

export default PriorityTag;