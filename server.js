const express = require('express');
const { Pool } = require('pg'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const rimraf = require('rimraf');
const { spawn } = require('child_process');

// Create express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL Connection with retry logic
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',    // Changed from 'root' to default PostgreSQL user        
    password: process.env.DB_PASSWORD || '0306',      
    port: process.env.DB_PORT || 5432   // Added port for PostgreSQL
};

// Create a function to connect with retry
function connectWithRetry(maxRetries = 10, delay = 5000) {
    let retries = 0;
    
    // First connect to default 'postgres' database to check/create our database
    const rootPool = new Pool({
        ...dbConfig,
        database: 'postgres'  // Connect to default PostgreSQL database
    });
    
    // Function to create database if not exists and then connect to it
    const setupDatabase = async () => {
        try {
            // Check if database exists
            const dbCheckResult = await rootPool.query(
                "SELECT 1 FROM pg_database WHERE datname = $1", 
                ['apollo_tyres']
            );
            
            // Create database if it doesn't exist
            if (dbCheckResult.rows.length === 0) {
                console.log('Database apollo_tyres does not exist, creating it now...');
                await rootPool.query('CREATE DATABASE apollo_tyres');
                console.log('Database apollo_tyres created successfully');
            } else {
                console.log('Database apollo_tyres already exists');
            }
            
            // Close the connection to postgres database
            await rootPool.end();
            
            // Now create the connection pool to our application database
            const pool = new Pool({
                ...dbConfig,
                database: 'apollo_tyres'
            });
            
            return pool;
        } catch (error) {
            console.error('Error setting up database:', error);
            await rootPool.end();
            throw error;
        }
    };
    
    // Function to try connecting with retry logic
    const tryConnect = async () => {
        try {
            const pool = await setupDatabase();
            
            // Test connection
            await pool.query('SELECT NOW()');
            console.log('Connected to PostgreSQL database');
            
            // Create the user table if it doesn't exist
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            
            pool.query(createTableQuery, (err) => {
                if (err) {
                    console.error('Error creating users table:', err);
                    return;
                }
                
                // Check if admin user exists, if not create it
                const checkAdminQuery = 'SELECT * FROM users WHERE email = $1';
                pool.query(checkAdminQuery, ['admin@apollotyres.com'], (err, results) => {
                    if (err) {
                        console.error('Error checking admin user:', err);
                        return;
                    }
                    
                    if (results.rowCount === 0) {
                        // Create admin user with password Apollo@123
                        bcrypt.hash('Apollo@123', 10, (err, hash) => {
                            if (err) {
                                console.error('Error hashing password:', err);
                                return;
                            }
                            
                            const insertAdminQuery = 'INSERT INTO users (email, password) VALUES ($1, $2)';
                            pool.query(insertAdminQuery, ['admin@apollotyres.com', hash], (err) => {
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
                    number_of_runs INT,
                    tests VARCHAR(255),
                    ips VARCHAR(255),
                    loads VARCHAR(255),
                    ias VARCHAR(255),
                    sa_range VARCHAR(255),
                    sr_range VARCHAR(255),
                    test_velocity VARCHAR(255),
                    job VARCHAR(255),
                    old_job VARCHAR(255),
                    p VARCHAR(255),
                    l VARCHAR(255)
                )
            `;
            
            pool.query(createMFDataTable, (err) => {
                if (err) {
                    console.error('Error creating mf_data table:', err);
                    return;
                }
                console.log('MF data table created successfully');
            });

            // Add after existing table creations
            const createMF52DataTable = `
                CREATE TABLE IF NOT EXISTS mf52_data (
                    number_of_runs INT,
                    tests VARCHAR(255),
                    inflation_pressure VARCHAR(255),
                    loads VARCHAR(255),
                    inclination_angle VARCHAR(255),
                    slip_angle VARCHAR(255),
                    slip_ratio VARCHAR(255),
                    test_velocity VARCHAR(255),
                    job VARCHAR(255),
                    old_job VARCHAR(255),
                    p VARCHAR(255),
                    l VARCHAR(255)
                )
            `;

            pool.query(createMF52DataTable, (err) => {
                if (err) {
                    console.error('Error creating mf52_data table:', err);
                    return;
                }
                console.log('MF 5.2 data table created successfully');
            });

            // Add FTire table creation with exact column names
            const createFTireDataTable = `
                CREATE TABLE IF NOT EXISTS ftire_data (
                    number_of_runs INT,
                    tests VARCHAR(255),
                    loads VARCHAR(255),
                    inflation_pressure VARCHAR(255),
                    test_velocity VARCHAR(255),
                    longitudinal_slip VARCHAR(255),
                    slip_angle VARCHAR(255),
                    inclination_angle VARCHAR(255),
                    cleat_orientation VARCHAR(255),
                    job VARCHAR(255),
                    old_job VARCHAR(255),
                    p VARCHAR(255),
                    l VARCHAR(255)
                )
            `;

            pool.query(createFTireDataTable, (err) => {
                if (err) {
                    console.error('Error creating ftire_data table:', err);
                    return;
                }
                console.log('FTire data table created successfully');
            });

            const createCDTireDataTable = `
                CREATE TABLE IF NOT EXISTS cdtire_data (
                    number_of_runs INT,
                    test_name VARCHAR(255),
                    inflation_pressure VARCHAR(255),
                    velocity VARCHAR(255),
                    preload VARCHAR(255),
                    camber VARCHAR(255),
                    slip_angle VARCHAR(255),
                    displacement VARCHAR(255),
                    slip_range VARCHAR(255),
                    cleat VARCHAR(255),
                    road_surface VARCHAR(255),
                    job VARCHAR(255),
                    old_job VARCHAR(255),
                    p VARCHAR(255),
                    l VARCHAR(255)
                )
            `;

            pool.query(createCDTireDataTable, (err) => {
                if (err) {
                    console.error('Error creating cdtire_data table:', err);
                    return;
                }
                console.log('CDTire data table created successfully');
            });

            // Create the custom_data table if it doesn't exist
            const createCustomDataTable = `
                CREATE TABLE IF NOT EXISTS custom_data (
                    number_of_runs INT,
                    protocol VARCHAR(255),
                    tests VARCHAR(255),
                    inflation_pressure VARCHAR(255),
                    loads VARCHAR(255),
                    inclination_angle VARCHAR(255),
                    slip_angle VARCHAR(255),
                    slip_ratio VARCHAR(255),
                    test_velocity VARCHAR(255),
                    cleat_orientation VARCHAR(255),
                    displacement VARCHAR(255),
                    job VARCHAR(255),
                    old_job VARCHAR(255),
                    p VARCHAR(255),
                    l VARCHAR(255)
                )
            `;

            pool.query(createCustomDataTable, (err) => {
                if (err) {
                    console.error('Error creating custom_data table:', err);
                    return;
                }
                console.log('Custom data table created successfully');
            });

            return pool;
        } catch (err) {
            console.error(`Error connecting to PostgreSQL database (attempt ${retries + 1}):`, err);
            
            if (retries < maxRetries) {
                retries++;
                console.log(`Retrying in ${delay/1000} seconds...`);
                return new Promise(resolve => {
                    setTimeout(() => resolve(tryConnect()), delay);
                });
            } else {
                console.error(`Max retries (${maxRetries}) reached. Unable to connect to PostgreSQL database.`);
                throw err;
            }
        }
    };
    
    return tryConnect();
}

// Connect to PostgreSQL with retry - now returns a Promise
let dbPromise = connectWithRetry();
let db;

// Initialize db when connection is established
dbPromise.then(pool => {
    db = pool;
    console.log('Database connection established and assigned to db variable');
}).catch(err => {
    console.error('Failed to establish database connection:', err);
});

// Secret key for JWT
const JWT_SECRET = 'apollo-tyres-secret-key'; // In production, use environment variable


app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
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
    const query = 'SELECT * FROM users WHERE email = $1';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
        
        // Check if user exists
        if (results.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        const user = results.rows[0];
        
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

// Configure multer for custom protocol file upload
const customProtocolStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'protocol');
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Save as Custom.xlsx
        cb(null, 'Custom.xlsx');
    }
});

const uploadCustomProtocol = multer({ storage: customProtocolStorage });

// Add new endpoint for uploading custom protocol file
app.post('/api/upload-custom-protocol', uploadCustomProtocol.single('customProtocolFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file received'
        });
    }

    res.json({
        success: true,
        message: 'Custom protocol file uploaded successfully',
        filename: 'Custom.xlsx'
    });
});

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

// Add these utility functions after other middleware definitions
function clearAbaqusFolder() {
    const abaqusPath = path.join(__dirname, 'abaqus');
    if (fs.existsSync(abaqusPath)) {
        rimraf.sync(abaqusPath);
    }
    fs.mkdirSync(abaqusPath, { recursive: true });
}

// Replace the existing store-excel-data endpoint with this modified version
app.post('/api/store-excel-data', (req, res) => {
    const { data } = req.body;
    
    if (!Array.isArray(data) || !data.length) {
        return res.status(400).json({
            success: false,
            message: 'Invalid data format'
        });
    }

    // First truncate the table
    const truncateQuery = 'TRUNCATE TABLE mf_data';
    db.query(truncateQuery, (truncateErr) => {
        if (truncateErr) {
            console.error('Error truncating table:', truncateErr);
            return res.status(500).json({
                success: false,
                message: 'Error clearing existing data'
            });
        }

        // PostgreSQL doesn't support the VALUES ? syntax, use individual inserts with Promise.all
        const insertPromises = data.map(row => {
            const insertQuery = `
                INSERT INTO mf_data 
                (number_of_runs, tests, ips, loads, ias, sa_range, sr_range, test_velocity, job, old_job, p, l)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            
            return db.query(insertQuery, [
                row.number_of_runs,
                row.tests,
                row.ips,
                row.loads,
                row.ias,
                row.sa_range,
                row.sr_range,
                row.test_velocity,
                row.job || '',
                row.old_job || '',
                row.p || '',
                row.l || ''
            ]);
        });

        Promise.all(insertPromises)
            .then(() => {
                res.json({
                    success: true,
                    message: 'Data stored successfully'
                });
            })
            .catch(err => {
                console.error('Error storing data:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error storing data'
                });
            });
    });
});

// Update Excel file reading endpoint to be page-specific
app.get('/api/read-protocol-excel', (req, res) => {
    const protocolDir = path.join(__dirname, 'protocol');
    const referer = req.headers.referer || '';
    let fileName;

    if (referer.includes('ftire.html')) {
        fileName = 'FTire.xlsx';
    } else if (referer.includes('mf52.html')) {
        fileName = 'MF5pt2.xlsx';
    } else if (referer.includes('mf.html')) {
        fileName = 'MF6pt2.xlsx';
    } else if (referer.includes('cdtire.html')) {
        fileName = 'CDTire.xlsx';
    } else if (referer.includes('custom.html')) {
        fileName = 'Custom.xlsx';
    } else {
        return res.status(400).json({
            success: false,
            message: 'Unknown protocol page'
        });
    }

    const filePath = path.join(protocolDir, fileName);
    
    if (!fs.existsSync(protocolDir)) {
        fs.mkdirSync(protocolDir, { recursive: true });
    }
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
            success: false, 
            message: `${fileName} not found in protocol folder` 
        });
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
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
        res.json(results.rows); // Changed from results to results.rows
    });
});

// Add new endpoint to get test summary data
app.get('/api/get-test-summary', (req, res) => {
    const query = `
        SELECT tests, COUNT(*) as count
        FROM mf_data
        WHERE tests IS NOT NULL AND tests != ''
        GROUP BY tests
        ORDER BY count DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching test summary:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching test summary'
            });
        }
        res.json(results.rows); // Changed from results to results.rows
    });
});

// Add new endpoint for MF 5.2 data
app.post('/api/store-mf52-data', (req, res) => {
    const { data } = req.body;
    
    if (!Array.isArray(data) || !data.length) {
        return res.status(400).json({
            success: false,
            message: 'Invalid data format'
        });
    }

    // First truncate the table
    const truncateQuery = 'TRUNCATE TABLE mf52_data';
    db.query(truncateQuery, (truncateErr) => {
        if (truncateErr) {
            return res.status(500).json({
                success: false,
                message: 'Error clearing existing data'
            });
        }

        // PostgreSQL doesn't support the VALUES ? syntax, use individual inserts with Promise.all
        const insertPromises = data.map(row => {
            const insertQuery = `
                INSERT INTO mf52_data 
                (number_of_runs, tests, inflation_pressure, loads, inclination_angle, 
                 slip_angle, slip_ratio, test_velocity, job, old_job, p, l)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            
            return db.query(insertQuery, [
                row.number_of_runs,
                row.tests,
                row.inflation_pressure,
                row.loads,
                row.inclination_angle,
                row.slip_angle,
                row.slip_ratio,
                row.test_velocity,
                row.job || '',
                row.old_job || '',
                row.p || '',
                row.l || ''
            ]);
        });

        Promise.all(insertPromises)
            .then(() => {
                res.json({
                    success: true,
                    message: 'Data stored successfully'
                });
            })
            .catch(err => {
                return res.status(500).json({
                    success: false,
                    message: 'Error storing data'
                });
            });
    });
});

// Add endpoint to get MF 5.2 data
app.get('/api/get-mf52-data', (req, res) => {
    const query = 'SELECT * FROM mf52_data ORDER BY number_of_runs';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching data'
            });
        }
        res.json(results.rows); // Changed from results to results.rows
    });
});

// Add new endpoint for MF 5.2 test summary data
app.get('/api/get-mf52-summary', (req, res) => {
    const query = `
        SELECT tests, COUNT(*) as count
        FROM mf52_data
        WHERE tests IS NOT NULL AND tests != ''
        GROUP BY tests
        ORDER BY count DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching MF 5.2 summary:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching test summary'
            });
        }
        res.json(results.rows || []); // Changed from results to results.rows
    });
});

// Add FTire data endpoints with correct columns
app.post('/api/store-ftire-data', (req, res) => {
    const { data } = req.body;
    
    if (!Array.isArray(data) || !data.length) {
        return res.status(400).json({
            success: false,
            message: 'Invalid data format'
        });
    }

    const truncateQuery = 'TRUNCATE TABLE ftire_data';
    db.query(truncateQuery, (truncateErr) => {
        if (truncateErr) {
            return res.status(500).json({
                success: false,
                message: 'Error clearing existing data'
            });
        }

        // PostgreSQL doesn't support the VALUES ? syntax, use individual inserts with Promise.all
        const insertPromises = data.map(row => {
            const insertQuery = `
                INSERT INTO ftire_data 
                (number_of_runs, tests, loads, inflation_pressure, test_velocity,
                 longitudinal_slip, slip_angle, inclination_angle, cleat_orientation, job, old_job, p, l)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `;
            
            return db.query(insertQuery, [
                row.number_of_runs || 0,
                row.tests || '',
                row.loads || '',
                row.inflation_pressure || '',
                row.test_velocity || '',
                row.longitudinal_slip || '',
                row.slip_angle || '',
                row.inclination_angle || '',
                row.cleat_orientation || '',
                row.job || '',
                row.old_job || '',
                row.p || '',
                row.l || ''
            ]);
        });

        Promise.all(insertPromises)
            .then(() => {
                res.json({
                    success: true,
                    message: 'Data stored successfully'
                });
            })
            .catch(err => {
                return res.status(500).json({
                    success: false,
                    message: 'Error storing data'
                });
            });
    });
});

app.get('/api/get-ftire-data', (req, res) => {
    const query = 'SELECT * FROM ftire_data ORDER BY number_of_runs';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching data'
            });
        }
        res.json(results.rows); // Changed from results to results.rows
    });
});

app.get('/api/get-ftire-summary', (req, res) => {
    const query = `
        SELECT tests, COUNT(*) as count
        FROM ftire_data
        WHERE tests IS NOT NULL AND tests != ''
        GROUP BY tests
        ORDER BY count DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching test summary'
            });
        }
        res.json(results.rows || []); // Changed from results to results.rows
    });
});

app.post('/api/store-cdtire-data', (req, res) => {
    const { data } = req.body;
    
    if (!Array.isArray(data) || !data.length) {
        return res.status(400).json({
            success: false,
            message: 'Invalid data format'
        });
    }

    const truncateQuery = 'TRUNCATE TABLE cdtire_data';
    db.query(truncateQuery, (truncateErr) => {
        if (truncateErr) {
            return res.status(500).json({
                success: false,
                message: 'Error clearing existing data'
            });
        }

        // PostgreSQL doesn't support the VALUES ? syntax, use individual inserts with Promise.all
        const insertPromises = data.map(row => {
            const insertQuery = `
                INSERT INTO cdtire_data 
                (number_of_runs, test_name, inflation_pressure, velocity, preload,
                 camber, slip_angle, displacement, slip_range, cleat, road_surface, job, old_job, p, l)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `;
            
            return db.query(insertQuery, [
                row.number_of_runs || 0,
                row.test_name || '',
                row.inflation_pressure || '',
                row.velocity || '',
                row.preload || '',
                row.camber || '',
                row.slip_angle || '',
                row.displacement || '',
                row.slip_range || '',
                row.cleat || '',
                row.road_surface || '',
                row.job || '',
                row.old_job || '',
                row.p || '',
                row.l || ''
            ]);
        });

        Promise.all(insertPromises)
            .then(() => {
                res.json({
                    success: true,
                    message: 'Data stored successfully'
                });
            })
            .catch(err => {
                return res.status(500).json({
                    success: false,
                    message: 'Error storing data'
                });
            });
    });
});

app.get('/api/get-cdtire-data', (req, res) => {
    const query = 'SELECT * FROM cdtire_data ORDER BY number_of_runs';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching data'
            });
        }
        res.json(results.rows); // Changed from results to results.rows
    });
});

app.get('/api/get-cdtire-summary', (req, res) => {
    const query = `
        SELECT test_name, COUNT(*) as count
        FROM cdtire_data
        WHERE test_name IS NOT NULL AND test_name != ''
        GROUP BY test_name
        ORDER BY count DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching CDTire summary:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching test summary'
            });
        }
        res.json(results.rows || []); // Changed from results to results.rows
    });
});

// Add Custom data endpoints
app.post('/api/store-custom-data', (req, res) => {
    const { data } = req.body;
    
    if (!Array.isArray(data) || !data.length) {
        return res.status(400).json({
            success: false,
            message: 'Invalid data format'
        });
    }

    const truncateQuery = 'TRUNCATE TABLE custom_data';
    db.query(truncateQuery, (truncateErr) => {
        if (truncateErr) {
            return res.status(500).json({
                success: false,
                message: 'Error clearing existing data'
            });
        }

        // PostgreSQL doesn't support the VALUES ? syntax, use individual inserts with Promise.all
        const insertPromises = data.map(row => {
            const insertQuery = `
                INSERT INTO custom_data 
                (number_of_runs, protocol, tests, inflation_pressure, loads,
                 inclination_angle, slip_angle, slip_ratio, test_velocity, 
                 cleat_orientation, displacement, job, old_job, p, l)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `;
            
            return db.query(insertQuery, [
                row.number_of_runs || 0,
                row.protocol || '',
                row.tests || '',
                row.inflation_pressure || '',
                row.loads || '',
                row.inclination_angle || '',
                row.slip_angle || '',
                row.slip_ratio || '',
                row.test_velocity || '',
                row.cleat_orientation || '',
                row.displacement || '',
                row.job || '',
                row.old_job || '',
                row.p || '',
                row.l || ''
            ]);
        });

        Promise.all(insertPromises)
            .then(() => {
                res.json({
                    success: true,
                    message: 'Data stored successfully'
                });
            })
            .catch(err => {
                return res.status(500).json({
                    success: false,
                    message: 'Error storing data'
                });
            });
    });
});

app.get('/api/get-custom-data', (req, res) => {
    const query = 'SELECT * FROM custom_data ORDER BY number_of_runs';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching data'
            });
        }
        res.json(results.rows); // Using results.rows for PostgreSQL
    });
});

app.get('/api/get-custom-summary', (req, res) => {
    const query = `
        SELECT tests, COUNT(*) as count
        FROM custom_data
        WHERE tests IS NOT NULL AND tests != ''
        GROUP BY tests
        ORDER BY count DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching Custom summary:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching test summary'
            });
        }
        res.json(results.rows || []);
    });
});

// Add new endpoints for folder management
app.post('/api/clear-folders', (req, res) => {
    const { projectName, protocol } = req.body;
    const combinedFolderName = `${projectName}_${protocol}`;
    const projectPath = path.join(__dirname, 'abaqus', combinedFolderName);
    
    try {
        if (fs.existsSync(projectPath)) {
            rimraf.sync(projectPath);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error clearing folders'
        });
    }
});

app.post('/api/generate-parameters', (req, res) => {
    try {
        const referer = req.headers.referer || '';
        let templatePath;

        // Select template based on protocol page
        if (referer.includes('mf.html')) {
            templatePath = path.join(__dirname, 'abaqus', 'mf62.inc');
        } else if (referer.includes('mf52.html')) {
            templatePath = path.join(__dirname, 'abaqus', 'mf52.inc');
        } else if (referer.includes('ftire.html')) {
            templatePath = path.join(__dirname, 'abaqus', 'ftire.inc');
        } else if (referer.includes('cdtire.html')) {
            templatePath = path.join(__dirname, 'abaqus', 'cdtire.inc');
        } else if (referer.includes('custom.html')) {
            templatePath = path.join(__dirname, 'abaqus', 'custom.inc');
        } else {
            throw new Error('Unknown protocol');
        }

        const outputPath = path.join(__dirname, 'abaqus', 'parameters.inc');
        
        // Read template file
        let content = fs.readFileSync(templatePath, 'utf8');
        
        // Replace parameter values, being careful with line matching
        const data = req.body;
        const replacements = {
            '^load1_kg=': `load1_kg=${data.load1_kg || ''}`,
            '^load2_kg=': `load2_kg=${data.load2_kg || ''}`,
            '^load3_kg=': `load3_kg=${data.load3_kg || ''}`,
            '^load4_kg=': `load4_kg=${data.load4_kg || ''}`,
            '^load5_kg=': `load5_kg=${data.load5_kg || ''}`,
            '^pressure1=': `pressure1=${data.pressure1 || ''}`,
            '^pressure2=': `pressure2=${data.pressure2 || ''}`,
            '^pressure3=': `pressure3=${data.pressure3 || ''}`,
            '^speed_kmph=': `speed_kmph=${data.speed_kmph || ''}`,
            '^IA=': `IA=${data.IA || ''}`,
            '^SA=': `SA=${data.SA || ''}`,
            '^SR=': `SR=${data.SR || ''}`,
            '^width=': `width=${data.width || ''}`,
            '^diameter=': `diameter=${data.diameter || ''}`
        };

        // Replace each parameter if it exists in the template with exact line start matching
        Object.entries(replacements).forEach(([key, value]) => {
            const regex = new RegExp(key + '.*', 'm');
            if (content.match(regex)) {
                content = content.replace(regex, value);
            }
        });

        // Write new parameter file
        fs.writeFileSync(outputPath, content);

        res.json({
            success: true,
            message: 'Parameter file generated successfully'
        });
    } catch (err) {
        console.error('Error generating parameter file:', err);
        res.status(500).json({
            success: false,
            message: 'Error generating parameter file'
        });
    }
});

app.post('/api/run-abaqus-jobs', (req, res) => {
    const { projectName, protocol, runNumber } = req.body;
    const combinedFolderName = `${projectName}_${protocol}`;
    const projectPath = path.join(__dirname, 'abaqus', combinedFolderName);
    const pythonScript = path.join(__dirname, 'scripts', 'run_abaqus.py');

    try {
        if (!fs.existsSync(projectPath)) {
            return res.status(404).json({
                success: false,
                message: 'Project folder not found'
            });
        }

        const args = [pythonScript, projectPath];
        if (runNumber) {
            args.push(runNumber);
        }

        // Run Python script with error handling
        const pythonProcess = spawn('python', args, {
            shell: true,
            detached: true
        });

        // Handle process errors and termination
        pythonProcess.on('error', (err) => {
            console.error('Python process error:', err);
        });

        pythonProcess.unref();

        res.json({
            success: true,
            message: 'Analysis started'
        });

    } catch (err) {
        console.error('Error launching process:', err);
        res.status(500).json({
            success: false,
            message: 'Error launching process: ' + err.message
        });
    }
});

// Add new endpoint for protocol-based folder creation on submit
app.post('/api/create-protocol-folders', (req, res) => {
    const { projectName, protocol } = req.body;
    
    if (!projectName || !protocol) {
        return res.status(400).json({
            success: false,
            message: 'Project name and protocol are required'
        });
    }
    
    const combinedFolderName = `${projectName}_${protocol}`;
    const projectPath = path.join(__dirname, 'abaqus', combinedFolderName);
    
    try {
        // Create base project folder
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
        }
        
        // Map protocol names to their template folder names
        const protocolMap = {
            'MF62': 'MF6pt2',
            'MF52': 'MF5pt2',
            'FTire': 'FTire',
            'CDTire': 'CDTire',
            'Custom': 'Custom'
        };
        
        const templateProtocolName = protocolMap[protocol];
        if (!templateProtocolName) {
            throw new Error(`Unknown protocol: ${protocol}`);
        }
        
        const templatePath = path.join(__dirname, 'abaqus', 'templates', templateProtocolName);
        
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template folder not found: ${templatePath}`);
        }
        
        // Copy all template subfolders (P1_L1, P1_L2, etc.) to the project folder
        const subfolders = fs.readdirSync(templatePath).filter(item => 
            fs.statSync(path.join(templatePath, item)).isDirectory()
        );
        
        if (subfolders.length === 0) {
            throw new Error(`No subfolders found in template: ${templatePath}`);
        }
        
        subfolders.forEach(subfolder => {
            const sourceSubfolder = path.join(templatePath, subfolder);
            const destSubfolder = path.join(projectPath, subfolder);
            
            // Create destination subfolder
            if (!fs.existsSync(destSubfolder)) {
                fs.mkdirSync(destSubfolder, { recursive: true });
            }
            
            // Copy all files from template subfolder recursively
            function copyFolderSync(src, dest) {
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true });
                }
                
                const items = fs.readdirSync(src);
                items.forEach(item => {
                    const srcPath = path.join(src, item);
                    const destPath = path.join(dest, item);
                    
                    if (fs.statSync(srcPath).isDirectory()) {
                        copyFolderSync(srcPath, destPath);
                    } else {
                        fs.copyFileSync(srcPath, destPath);
                    }
                });
            }
            
            copyFolderSync(sourceSubfolder, destSubfolder);
        });
        
        // Copy parameters.inc to each subfolder
        const parametersPath = path.join(__dirname, 'abaqus', 'parameters.inc');
        if (fs.existsSync(parametersPath)) {
            subfolders.forEach(subfolder => {
                const destParametersPath = path.join(projectPath, subfolder, 'parameters.inc');
                fs.copyFileSync(parametersPath, destParametersPath);
            });
        } else {
            console.warn('parameters.inc not found, skipping copy to subfolders');
        }
        
        res.json({ 
            success: true, 
            message: 'Protocol folders created successfully',
            foldersCreated: subfolders,
            projectPath: combinedFolderName
        });
        
    } catch (err) {
        console.error('Error creating protocol folders:', err);
        res.status(500).json({
            success: false,
            message: 'Error creating protocol folders: ' + err.message
        });
    }
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