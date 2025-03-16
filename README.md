Run npm init -y to create a package.json file
Install required packages: npm install express mysql2 bcrypt jsonwebtoken
For development: npm install nodemon --save-dev


-- Create database (if it doesn't exist)
CREATE DATABASE IF NOT EXISTS apollo_tyres;

-- Use the database
USE apollo_tyres;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Note: The script in server.js will handle creating an admin user
-- with email: admin@apollotyres.com and password: Apollo@123

npm install multer

npm install rimraf