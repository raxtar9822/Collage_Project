-- Hospital Meals Database Schema for MySQL
-- Run this script in MySQL Workbench or command line

-- Create database
CREATE DATABASE IF NOT EXISTS hospital_meals;
USE hospital_meals;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','nurse','kitchen','delivery','receptionist') NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mrn VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    ward VARCHAR(50) NOT NULL,
    bed VARCHAR(20) NOT NULL,
    room_number VARCHAR(20) DEFAULT '',
    dietary_restrictions TEXT DEFAULT '',
    allergies TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    dietary VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    item_id INT NOT NULL,
    special_instructions TEXT DEFAULT '',
    status ENUM('placed','in_kitchen','out_for_delivery','delivered','cancelled') DEFAULT 'placed',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by INT NOT NULL,
    consumption_status ENUM('unknown','eaten','partial','refused') DEFAULT 'unknown',
    waste_percent INT DEFAULT 0,
    consumption_recorded_at TIMESTAMP NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Tiffin orders table
CREATE TABLE IF NOT EXISTS tiffin_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    ward VARCHAR(50) NOT NULL,
    food_type VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 1,
    order_date DATE NOT NULL,
    status ENUM('pending','confirmed','preparing','ready','delivered','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    notes TEXT DEFAULT '',
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT DEFAULT '',
    user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default users
INSERT INTO users (username, password_hash, role, full_name) VALUES
('messowner', '$2b$10$rQZ8K9vL8xY7zA6bC5dEeOjK2mN3pQ4rS5tU6vW7xY8zA9bC0dE', 'admin', 'Mess Owner'),
('admin', '$2b$10$rQZ8K9vL8xY7zA6bC5dEeOjK2mN3pQ4rS5tU6vW7xY8zA9bC0dE', 'admin', 'System Admin'),
('nurse1', '$2b$10$rQZ8K9vL8xY7zA6bC5dEeOjK2mN3pQ4rS5tU6vW7xY8zA9bC0dE', 'nurse', 'Nurse Joy'),
('kitchen1', '$2b$10$rQZ8K9vL8xY7zA6bC5dEeOjK2mN3pQ4rS5tU6vW7xY8zA9bC0dE', 'kitchen', 'Chef Alex'),
('delivery1', '$2b$10$rQZ8K9vL8xY7zA6bC5dEeOjK2mN3pQ4rS5tU6vW7xY8zA9bC0dE', 'delivery', 'Rider Sam'),
('receptionist1', '$2b$10$rQZ8K9vL8xY7zA6bC5dEeOjK2mN3pQ4rS5tU6vW7xY8zA9bC0dE', 'receptionist', 'Receptionist Sarah');

-- Insert sample patients
INSERT INTO patients (mrn, full_name, ward, bed, room_number, dietary_restrictions, allergies) VALUES
('MRN-001', 'John Doe', 'Ward A', 'A-12', 'A-12', 'Low Sodium', 'Penicillin'),
('MRN-002', 'Jane Smith', 'Ward B', 'B-03', 'B-03', 'Diabetic', 'Nuts');

-- Insert Indian menu items
INSERT INTO menu_items (name, category, dietary) VALUES
-- Breakfast
('Idli with Sambar', 'Breakfast', 'Vegetarian'),
('Masala Dosa', 'Breakfast', 'Vegetarian'),
('Poha', 'Breakfast', 'Vegetarian'),
('Upma', 'Breakfast', 'Vegetarian'),
('Paratha (Aloo/Gobi)', 'Breakfast', 'Vegetarian'),
-- Lunch
('Dal Tadka', 'Lunch', 'Vegetarian'),
('Rajma Masala', 'Lunch', 'Vegetarian'),
('Chole (Chickpea Curry)', 'Lunch', 'Vegan'),
('Paneer Butter Masala', 'Lunch', 'Vegetarian'),
('Chicken Curry', 'Lunch', ''),
('Veg Biryani', 'Lunch', 'Vegetarian'),
('Chicken Biryani', 'Lunch', ''),
('Jeera Rice', 'Lunch', 'Vegan, Gluten-Free'),
('Roti/Chapati', 'Lunch', 'Vegan'),
-- Dinner
('Palak Paneer', 'Dinner', 'Vegetarian'),
('Fish Curry', 'Dinner', ''),
('Mixed Veg Curry', 'Dinner', 'Vegan'),
('Kadhi', 'Dinner', 'Vegetarian'),
('Khichdi', 'Dinner', 'Vegetarian, Light'),
-- Snacks/Drinks
('Samosa (Baked)', 'Snack', 'Vegetarian'),
('Onion Pakora', 'Snack', 'Vegan'),
('Masala Chai', 'Snack', ''),
('Sweet Lassi', 'Snack', 'Vegetarian'),
('Raita (Curd)', 'Snack', 'Vegetarian');

-- Show tables
SHOW TABLES;

-- Show table structures
DESCRIBE users;
DESCRIBE patients;
DESCRIBE menu_items;
DESCRIBE orders;
DESCRIBE tiffin_orders;
DESCRIBE audit_logs;
