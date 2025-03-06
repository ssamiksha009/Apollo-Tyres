const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const XLSX = require('xlsx');

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
    // Add this to the existing db.connect callback in server.js
    const createMFTableQuery = `
    CREATE TABLE IF NOT EXISTS mftable (
        \`Number Of Runs\` INT PRIMARY KEY,
        \`Tests\` VARCHAR(255),
        \`IPs\` FLOAT,
        \`Loads\` FLOAT,
        \`IAs\` FLOAT,
        \`SA Range\` FLOAT,
        \`SR Range\` FLOAT,
        \`Test Velocity\` VARCHAR(255)
    )
    `;

    db.query(createMFTableQuery, (err) => {
    if (err) {
        console.error('Error creating mftable:', err);
        return;
    }
    console.log('MF table created or already exists');
    });

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

// Add new endpoint to read Excel file from protocol folder
app.get('/api/read-protocol-excel', (req, res) => {
    // Search for any Excel file in the protocol folder
    glob('protocol/*.xlsx', (err, files) => {
        if (err) {
            console.error('Error finding Excel file:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error finding Excel file' 
            });
        }

        if (files.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No Excel file found in protocol folder' 
            });
        }

        // Use the first Excel file found
        const filePath = files[0];
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error('Error reading Excel file:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error reading Excel file' 
                });
            }

            res.send(data);
        });
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



// Add this new endpoint to server.js

// Add this new endpoint to server.js and include more detailed logging
app.post('/api/process-mf-data', (req, res) => {  // Remove authenticateToken temporarily for testing
    console.log('Received request to process MF data');
    const replacements = req.body;
    console.log('Received replacements:', replacements);
    
    // Search for any Excel file in the protocol folder
    glob('protocol/*.xlsx', (err, files) => {
        if (err) {
            console.error('Error finding Excel file:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error finding Excel file' 
            });
        }

        console.log('Found Excel files:', files);
        if (files.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No Excel file found in protocol folder' 
            });
        }

        // Use the first Excel file found
        const filePath = files[0];
        console.log('Using Excel file:', filePath);
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error('Error reading Excel file:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error reading Excel file' 
                });
            }

            console.log('Successfully read Excel file');
            try {
                const workbook = XLSX.read(data);
                const firstSheetName = workbook.SheetNames[0];
                console.log('Using sheet:', firstSheetName);
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                console.log('Excel data row count:', jsonData.length);
                console.log('Sample first row:', jsonData[0]);
                
                // Process each row and replace values
                const processedData = jsonData.map(row => {
                    const newRow = {...row};
                    
                    // Process string values that might contain P1, P2, P3, etc.
                    for (let key in newRow) {
                        if (typeof newRow[key] === 'string') {
                            // Replace patterns like "L1,L2,L3" with actual values
                            if (newRow[key].includes('L1') && 
                                newRow[key].includes('L2') && 
                                newRow[key].includes('L3')) {
                                newRow[key] = `${replacements['L1']},${replacements['L2']},${replacements['L3']}`;
                            } else {
                                // Replace individual placeholders
                                for (let placeholder in replacements) {
                                    if (newRow[key].includes(placeholder)) {
                                        newRow[key] = newRow[key].replace(
                                            new RegExp(placeholder, 'g'), 
                                            replacements[placeholder]
                                        );
                                    }
                                }
                            }
                        }
                    }
                    
                    return newRow;
                });
                
                console.log('Processed data row count:', processedData.length);
                console.log('Sample processed first row:', processedData[0]);
                
                // Insert processed data into MySQL
                let insertedCount = 0;
                const insertPromises = processedData.map(row => {
                    return new Promise((resolve, reject) => {
                        // Make sure all required columns exist
                        if (!('Number Of Runs' in row)) {
                            console.log('Skipping row without Number Of Runs');
                            return resolve(); // Skip rows without required primary key
                        }
                        
                        console.log('Inserting row with Number Of Runs:', row['Number Of Runs']);
                        
                        const query = `
                            INSERT INTO mftable 
                            (\`Number Of Runs\`, \`Tests\`, \`IPs\`, \`Loads\`, \`IAs\`, \`SA Range\`, \`SR Range\`, \`Test Velocity\`) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE 
                            \`Tests\` = VALUES(\`Tests\`),
                            \`IPs\` = VALUES(\`IPs\`),
                            \`Loads\` = VALUES(\`Loads\`),
                            \`IAs\` = VALUES(\`IAs\`),
                            \`SA Range\` = VALUES(\`SA Range\`),
                            \`SR Range\` = VALUES(\`SR Range\`),
                            \`Test Velocity\` = VALUES(\`Test Velocity\`)
                        `;
                        
                        const values = [
                            row['Number Of Runs'] || null,
                            row['Tests'] || null,
                            parseFloat(row['IPs']) || null,
                            parseFloat(row['Loads']) || null,
                            parseFloat(row['IAs']) || null,
                            parseFloat(row['SA Range']) || null,
                            parseFloat(row['SR Range']) || null,
                            row['Test Velocity'] || null
                        ];
                        
                        console.log('Insert query values:', values);
                        
                        db.query(query, values, (err, result) => {
                            if (err) {
                                console.error('Error inserting data:', err);
                                reject(err);
                            } else {
                                console.log('Insert result:', result);
                                insertedCount++;
                                resolve();
                            }
                        });
                    });
                });
                
                Promise.all(insertPromises.filter(p => p)) // Filter out undefined promises
                    .then(() => {
                        console.log(`Successfully inserted/updated ${insertedCount} rows`);
                        res.json({ 
                            success: true, 
                            message: `Data successfully processed and stored in the database (${insertedCount} rows)` 
                        });
                    })
                    .catch(error => {
                        console.error('Error inserting data:', error);
                        res.status(500).json({ 
                            success: false, 
                            message: 'Error storing data in database' 
                        });
                    });
                
            } catch (error) {
                console.error('Error processing Excel file:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Error processing Excel file: ' + error.message 
                });
            }
        });
    });
});



startServer(port);
