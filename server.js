const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Create express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',              // Replace with your MySQL username
    password: '0306',      // Replace with your MySQL password
    database: 'apollo_tyres'
});

// Connect to MySQL
db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
    
    // Create the user table if it doesn't exist
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;
    
    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
            return;
        }
        
        // Check if admin user exists, if not create it
        const checkAdminQuery = 'SELECT * FROM users WHERE email = ?';
        db.query(checkAdminQuery, ['admin@apollotyres.com'], (err, results) => {
            if (err) {
                console.error('Error checking admin user:', err);
                return;
            }
            
            if (results.length === 0) {
                // Create admin user with password Apollo@123
                bcrypt.hash('Apollo@123', 10, (err, hash) => {
                    if (err) {
                        console.error('Error hashing password:', err);
                        return;
                    }
                    
                    const insertAdminQuery = 'INSERT INTO users (email, password) VALUES (?, ?)';
                    db.query(insertAdminQuery, ['admin@apollotyres.com', hash], (err) => {
                        if (err) {
                            console.error('Error creating admin user:', err);
                            return;
                        }
                        console.log('Admin user created successfully');
                    });
                });
            }
        });
    });

    // Create the mf_data table if it doesn't exist
    const createMFDataTable = `
        CREATE TABLE IF NOT EXISTS mf_data (
            number_of_runs INT PRIMARY KEY,
            tests VARCHAR(255),
            ips VARCHAR(255),
            loads VARCHAR(255),
            ias VARCHAR(255),
            sa_range VARCHAR(255),
            sr_range VARCHAR(255),
            test_velocity VARCHAR(255)
        )
    `;

    db.query(createMFDataTable, (err) => {
        if (err) {
            console.error('Error creating mf_data table:', err);
            return;
        }
        console.log('MF data table created successfully');
    });
});

// Secret key for JWT
const JWT_SECRET = 'apollo-tyres-secret-key'; // In production, use environment variable


// ...existing code...
// Update the static file middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
// Login API endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email and password are required' 
        });
    }
    
    // Query database for user
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
        
        // Check if user exists
        if (results.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        const user = results[0];
        
        // Compare password
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Internal server error' 
                });
            }
            
            if (!isMatch) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }
            
            // Create JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            
            // Return success with token
            return res.json({ 
                success: true, 
                token: token,
                message: 'Login successful' 
            });
        });
    });
});

// Token verification endpoint
app.get('/api/verify-token', authenticateToken, (req, res) => {
    // If authentication middleware passes, token is valid
    res.json({ 
        success: true, 
        user: { email: req.user.email }
    });
});

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication token required' 
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        
        req.user = user;
        next();
    });
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'protocol');
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Use fixed filename 'output.xlsx'
        cb(null, 'output.xlsx');
    }
});

const upload = multer({ storage: storage });

// Add new endpoint for saving Excel files
app.post('/api/save-excel', upload.single('excelFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file received'
        });
    }

    res.json({
        success: true,
        message: 'File saved successfully',
        filename: 'output.xlsx'
    });
});

// Add new endpoint for storing Excel data
app.post('/api/store-excel-data', (req, res) => {
    const { data } = req.body;
    
    if (!Array.isArray(data) || !data.length) {
        return res.status(400).json({
            success: false,
            message: 'Invalid data format'
        });
    }

    const insertQuery = `
        INSERT INTO mf_data 
        (number_of_runs, tests, ips, loads, ias, sa_range, sr_range, test_velocity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        tests = VALUES(tests),
        ips = VALUES(ips),
        loads = VALUES(loads),
        ias = VALUES(ias),
        sa_range = VALUES(sa_range),
        sr_range = VALUES(sr_range),
        test_velocity = VALUES(test_velocity)
    `;

    const promises = data.map(row => {
        return new Promise((resolve, reject) => {
            db.query(insertQuery, [
                row.number_of_runs,
                row.tests,
                row.ips,
                row.loads,
                row.ias,
                row.sa_range,
                row.sr_range,
                row.test_velocity
            ], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    });

    Promise.all(promises)
        .then(() => {
            console.log('Successfully inserted values in table mf_data');  // Add this line
            res.json({
                success: true,
                message: 'Data stored successfully'
            });
        })
        .catch(err => {
            console.error('Error storing data:', err);
            res.status(500).json({
                success: false,
                message: 'Error storing data'
            });
        });
});

// Update Excel file reading endpoint
app.get('/api/read-protocol-excel', (req, res) => {
    const filePath = path.join(__dirname, 'protocol', 'MF62.xlsx');
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
            success: false, 
            message: 'MF62.xlsx not found in protocol folder' 
        });
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('Error reading Excel file:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error reading Excel file' 
            });
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(data);
    });
});

// Add new endpoint for reading output Excel file
app.get('/api/read-output-excel', (req, res) => {
    const filePath = path.join(__dirname, 'protocol', 'output.xlsx');
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
            success: false, 
            message: 'Output file not found' 
        });
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('Error reading Excel file:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error reading Excel file' 
            });
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(data);
    });
});

// Add new endpoint to get MF data
app.get('/api/get-mf-data', (req, res) => {
    const query = 'SELECT * FROM mf_data ORDER BY number_of_runs';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching MF data:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching data'
            });
        }
        res.json(results);
    });
});

// Serve the main application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start the server
const port = process.env.PORT || 3000;

const startServer = (attemptPort) => {
    app.listen(attemptPort)
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${attemptPort} is busy, trying ${attemptPort + 1}...`);
                startServer(attemptPort + 1);
            } else {
                console.error('Server error:', err);
            }
        })
        .on('listening', () => {
            console.log(`Server running on port ${attemptPort}`);
        });
};

startServer(port);