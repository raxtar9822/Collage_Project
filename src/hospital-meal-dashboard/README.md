# 🏥 Hospital Meal Tracking Dashboard

A modern dashboard for managing and tracking meal orders in hospitals, featuring animated order cards, real-time statistics, and a mini-map for delivery personnel locations.

## 📋 Overview

This project provides a comprehensive solution for hospitals to efficiently manage meal orders. The dashboard includes:

- **Animated Order Cards**: Visual representation of meal orders showing progression from kitchen to delivery.
- **Color-Coded Priority Tags**: Tags indicating order urgency (red for urgent, yellow for dietary restrictions).
- **Real-Time Statistics**: Cards displaying pending orders, completed deliveries, and average delivery time.
- **Mini-Map**: A map showing the current locations of delivery personnel.

## 🎨 Design Theme

The dashboard adheres to a clean medical theme with soft blues and whites, ensuring a user-friendly interface that is easy to navigate.

## 🚀 Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd hospital-meal-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the development server, run:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` to view the dashboard.

## 📊 Features

- **Order Management**: View and manage meal orders with real-time updates.
- **Statistics Overview**: Access key metrics related to meal orders and deliveries.
- **Interactive Mini-Map**: Track delivery personnel in real-time.
- **Responsive Design**: Optimized for both desktop and mobile devices.

## 🛠 Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Real-Time Updates**: WebSockets for live data
- **State Management**: Custom hooks for managing application state

## 📄 File Structure

The project is organized as follows:

```
hospital-meal-dashboard
├── src
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages
│   │   └── Dashboard.tsx
│   ├── components
│   │   ├── OrderCard
│   │   │   ├── OrderCard.tsx
│   │   │   └── OrderCard.module.css
│   │   ├── StatsCard
│   │   │   ├── StatsCard.tsx
│   │   │   └── StatsCard.module.css
│   │   ├── MiniMap
│   │   │   ├── MiniMap.tsx
│   │   │   └── MiniMap.module.css
│   │   ├── PriorityTag
│   │   │   └── PriorityTag.tsx
│   │   └── AnimatedProgress
│   │       └── AnimatedProgress.tsx
│   ├── hooks
│   │   └── useRealtime.ts
│   ├── services
│   │   ├── api.ts
│   │   └── socket.ts
│   ├── styles
│   │   ├── globals.css
│   │   └── theme.css
│   ├── types
│   │   └── index.ts
│   └── utils
│       ├── time.ts
│       └── format.ts
├── public
│   └── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .eslintrc.json
├── .prettierrc
└── README.md
```

## 📞 Support

For any issues or feature requests, please open an issue in the repository.

---

*Built with ❤️ for better hospital meal management*