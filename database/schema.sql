CREATE DATABASE IF NOT EXISTS silkroute CHARACTER SET utf8mb4;
USE silkroute;

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id VARCHAR(20) NOT NULL UNIQUE,
  passenger_name VARCHAR(120) NOT NULL,
  origin VARCHAR(10) NOT NULL,
  destination VARCHAR(10) NOT NULL,
  lounge VARCHAR(80) DEFAULT NULL,
  status ENUM('Pending', 'Confirmed', 'Paid', 'On-hold', 'Completed') NOT NULL DEFAULT 'Pending',
  arrival_date DATE DEFAULT NULL,
  departure_date DATE DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  detail VARCHAR(255) NOT NULL,
  icon VARCHAR(30) DEFAULT 'file',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Agent', 'Manager') NOT NULL DEFAULT 'Agent',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed data matching the reference dashboard
INSERT INTO reservations (booking_id, passenger_name, origin, destination, lounge, status, arrival_date, departure_date, created_at) VALUES
('BK01620', 'John Harper',      'NYC', 'LHR', 'Business Lounge', 'Confirmed', CURDATE(), NULL,       NOW() - INTERVAL 1 HOUR),
('BK01618', 'Mia Perry',        'DXB', 'SIN', 'Emirates',        'Pending',   NULL,      CURDATE(), NOW() - INTERVAL 2 HOUR),
('BK01614', 'Ali S. Khan',      'LHR', 'CDG', 'A380 Lounge',     'Paid',      NULL,      CURDATE(), NOW() - INTERVAL 4 HOUR),
('BK01609', 'Sofia Martinez',   'LAX', 'NYC', NULL,              'Confirmed', CURDATE(), NULL,       NOW() - INTERVAL 6 HOUR),
('BK01604', 'Liam Alexander',   'SIN', 'DXB', 'VIP Lounge',      'Completed', NULL,      NULL,       NOW() - INTERVAL 8 HOUR);

INSERT INTO activity_log (title, detail, icon, created_at) VALUES
('Reservation Confirmed', 'Booking BK01620 confirmed for John Harper', 'check',  NOW() - INTERVAL 1 HOUR),
('Payment Pending',       'Payment is needed for booking BK01618',     'pencil', NOW() - INTERVAL 2 HOUR),
('New Reservation',       'New reservation created for M. Perry',      'plane',  NOW() - INTERVAL 3 HOUR),
('Reservation Updated',   'Lounge details updated for BK01614',        'file',   NOW() - INTERVAL 4 HOUR),
('Daily Report Generated','Daily sales report for 14 Sep 2026 generated','chart', NOW() - INTERVAL 5 HOUR);
