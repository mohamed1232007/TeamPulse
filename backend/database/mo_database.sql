drop DATABASE if EXISTS mo_database;

CREATE DATABASE mo_database;

USE mo_database;

CREATE TABLE users (
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    UserID VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE, 
    password VARCHAR(255) NOT NULL
);

CREATE TABLE tasks (
    TaskID VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    UserID VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES users(UserID) ON DELETE CASCADE
);

UPDATE users 
SET role = 'admin' 
WHERE email = 'mohamed@gmail.com';