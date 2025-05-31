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
            });            // Create the custom_data table if it doesn't exist
            const createCustomDataTable = `
                CREATE TABLE IF NOT EXISTS custom_data (
                    number_of_runs INT,
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
function clearProjectsFolder() {
    const projectsPath = path.join(__dirname, 'projects');
    if (fs.existsSync(projectsPath)) {
        rimraf.sync(projectsPath);
    }
    fs.mkdirSync(projectsPath, { recursive: true });
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

// Add new endpoint to get MF 5.2 data
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
        }        // PostgreSQL doesn't support the VALUES ? syntax, use individual inserts with Promise.all
        const insertPromises = data.map(row => {
            const insertQuery = `
                INSERT INTO custom_data 
                (number_of_runs, tests, inflation_pressure, loads,
                 inclination_angle, slip_angle, slip_ratio, test_velocity, 
                 cleat_orientation, displacement, job, old_job, p, l)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `;
            
            return db.query(insertQuery, [
                row.number_of_runs || 0,
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
    const projectPath = path.join(__dirname, 'projects', combinedFolderName);
    
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
            templatePath = path.join(__dirname, 'templates', 'inc', 'mf62.inc');
        } else if (referer.includes('mf52.html')) {
            templatePath = path.join(__dirname, 'templates', 'inc', 'mf52.inc');
        } else if (referer.includes('ftire.html')) {
            templatePath = path.join(__dirname, 'templates', 'inc', 'ftire.inc');
        } else if (referer.includes('cdtire.html')) {
            templatePath = path.join(__dirname, 'templates', 'inc', 'cdtire.inc');
        } else if (referer.includes('custom.html')) {
            templatePath = path.join(__dirname, 'templates', 'inc', 'custom.inc');
        } else {
            throw new Error('Unknown protocol');
        }
        
        // Generate parameters.inc in the central template location
        // This file will be copied to individual Px_Ly folders during project creation
        const outputPath = path.join(__dirname, 'templates', 'inc', 'parameters.inc');
        
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
    const projectPath = path.join(__dirname, 'projects', combinedFolderName);
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

// Configure multer for mesh file upload (temporary storage)
const meshFileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'temp');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Keep original filename
        cb(null, file.originalname);
    }
});

const uploadMeshFile = multer({ storage: meshFileStorage });

// Add new endpoint for uploading mesh files temporarily
app.post('/api/upload-mesh-file', uploadMeshFile.single('meshFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file received'
        });
    }

    res.json({
        success: true,
        message: 'Mesh file uploaded successfully',
        filename: req.file.originalname
    });
});

// Add new endpoint for protocol-based folder creation on submit
app.post('/api/create-protocol-folders', (req, res) => {
    const { projectName, protocol } = req.body;    if (!projectName || !protocol) {
        return res.status(400).json({
            success: false,
            message: 'Project name and protocol are required'
        });
    }
      // Function to generate unique folder name
    function generateUniqueFolderName(baseName, basePath) {
        let counter = 1;
        let uniqueName = baseName;
        let fullPath = path.join(basePath, uniqueName);
        
        // If folder doesn't exist, use the original name
        if (!fs.existsSync(fullPath)) {
            return uniqueName;
        }
        
        // If folder exists, remove it completely and create fresh
        if (fs.existsSync(fullPath)) {
            rimraf.sync(fullPath);
        }
        
        return uniqueName;
    }
    
    const baseCombinedName = `${projectName}_${protocol}`;
    const basePath = path.join(__dirname, 'projects');
    const combinedFolderName = generateUniqueFolderName(baseCombinedName, basePath);
    const projectPath = path.join(basePath, combinedFolderName);
    
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
        
        const templatePath = path.join(__dirname, 'templates', templateProtocolName);
        
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
        
        // Copy parameters.inc from central template location to each subfolder
        const centralParametersPath = path.join(__dirname, 'templates', 'inc', 'parameters.inc');
        if (fs.existsSync(centralParametersPath)) {
            subfolders.forEach(subfolder => {
                const destParametersPath = path.join(projectPath, subfolder, 'parameters.inc');
                fs.copyFileSync(centralParametersPath, destParametersPath);
            });
        }
        
        // Copy mesh file to all P_L folders if it exists
        const tempDir = path.join(__dirname, 'temp');
        if (fs.existsSync(tempDir)) {
            const meshFiles = fs.readdirSync(tempDir).filter(file => file.endsWith('.inp'));
            if (meshFiles.length > 0) {
                const meshFile = meshFiles[0]; // Use the first mesh file found
                const sourceMeshPath = path.join(tempDir, meshFile);
                
                subfolders.forEach(subfolder => {
                    const destMeshPath = path.join(projectPath, subfolder, meshFile);
                    try {
                        fs.copyFileSync(sourceMeshPath, destMeshPath);
                    } catch (copyErr) {
                        console.error(`Error copying mesh file to ${subfolder}:`, copyErr);
                    }
                });
                  // Clean up temporary mesh file
                try {
                    fs.unlinkSync(sourceMeshPath);
                } catch (cleanupErr) {
                    console.error('Error cleaning up temporary mesh file:', cleanupErr);
                }
            }
            
            // Clean up the entire temp directory after mesh file copying is done
            try {
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    console.log('Temp directory cleaned up successfully');
                }
            } catch (cleanupErr) {
                console.error('Error cleaning up temp directory:', cleanupErr);
            }
        }
        
        // Clean up parameters.inc from templates/inc/ after copying to all P_L folders
        try {
            if (fs.existsSync(centralParametersPath)) {
                fs.unlinkSync(centralParametersPath);
            }
        } catch (cleanupErr) {
            console.error('Error cleaning up central parameters.inc file:', cleanupErr);
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

// Add new endpoint for getting row data with p, l, job, old_job
app.get('/api/get-row-data', (req, res) => {
    const { protocol, runNumber } = req.query;
    
    if (!protocol || !runNumber) {
        return res.status(400).json({
            success: false,
            message: 'Protocol and run number are required'
        });
    }
    
    // Map protocol to table name
    const tableMap = {
        'mf62': 'mf_data',
        'mf52': 'mf52_data',
        'ftire': 'ftire_data',
        'cdtire': 'cdtire_data',
        'custom': 'custom_data'
    };
    
    const tableName = tableMap[protocol.toLowerCase()];
    if (!tableName) {
        return res.status(400).json({
            success: false,
            message: 'Invalid protocol'
        });
    }
    
    const query = `SELECT p, l, job, old_job FROM ${tableName} WHERE number_of_runs = $1`;
    
    db.query(query, [runNumber], (err, results) => {
        if (err) {
            console.error('Error fetching row data:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching row data'
            });
        }
        
        if (results.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Row not found'
            });
        }
        
        res.json({
            success: true,
            data: results.rows[0]
        });
    });
});

// Add new endpoint for checking ODB file existence
app.get('/api/check-odb-file', (req, res) => {
    const { projectName, protocol, folderName, jobName } = req.query;
    
    if (!projectName || !protocol || !folderName || !jobName) {
        return res.status(400).json({
            success: false,
            message: 'All parameters are required'
        });
    }
      const combinedFolderName = `${projectName}_${protocol}`;
    const odbPath = path.join(__dirname, 'projects', combinedFolderName, folderName, `${jobName}.odb`);
    
    const exists = fs.existsSync(odbPath);
    
    res.json({
        success: true,
        exists: exists,
        path: odbPath
    });
});

// Add new endpoint for job dependency resolution
app.post('/api/resolve-job-dependencies', (req, res) => {
    const { projectName, protocol, runNumber } = req.body;
    
    if (!projectName || !protocol || !runNumber) {
        return res.status(400).json({
            success: false,
            message: 'Project name, protocol, and run number are required'
        });
    }
    
    // Map protocol to table name
    const tableMap = {
        'mf62': 'mf_data',
        'mf52': 'mf52_data',
        'ftire': 'ftire_data',
        'cdtire': 'cdtire_data',
        'custom': 'custom_data'
    };
    
    const tableName = tableMap[protocol.toLowerCase()];
    if (!tableName) {
        return res.status(400).json({
            success: false,
            message: 'Invalid protocol'
        });
    }
      const combinedFolderName = `${projectName}_${protocol}`;
    const projectPath = path.join(__dirname, 'projects', combinedFolderName);    // Function to recursively resolve job dependencies with enhanced backtracking
    async function resolveDependencies(jobName, visitedJobs = new Set(), callerContext = null) {
        try {
            // Prevent infinite loops
            if (visitedJobs.has(jobName)) {
                console.log(`Circular dependency detected for job: ${jobName}, skipping`);
                return { success: true, message: `Circular dependency avoided for ${jobName}` };
            }
            visitedJobs.add(jobName);
            
            console.log(`\n=== Resolving dependencies for job: ${jobName} ===`);
              
            // Strict folder containment: Only look for jobs in the current P_L folder
            let jobData = null;
            let actualJobName = jobName;
            
            // Look for the job in caller's context (P_L folder) - and ONLY in this folder
            if (callerContext) {
                console.log(`Searching for job "${jobName}" in folder ${callerContext.p}_${callerContext.l}...`);
                jobData = await findJobInFolder(jobName, callerContext.p, callerContext.l);
                if (jobData) {
                    actualJobName = jobData.job;
                    console.log(`✓ Found "${actualJobName}" in folder ${callerContext.p}_${callerContext.l}`);
                }
            }
            
            // If not found in folder, throw error - we never search globally
            if (!jobData) {
                throw new Error(`Job "${jobName}" not found in folder ${callerContext ? callerContext.p + '_' + callerContext.l : 'unknown'}. Dependencies must exist within the same P_L folder.`);
            }
            
            const folderName = `${jobData.p}_${jobData.l}`;
            const folderPath = path.join(projectPath, folderName);
            
            // Check if current job's ODB already exists
            const odbJobName = actualJobName.endsWith('.inp') ? actualJobName.replace('.inp', '') : actualJobName;
            const odbPath = path.join(folderPath, `${odbJobName}.odb`);
            if (fs.existsSync(odbPath)) {
                console.log(`✓ ODB already exists for job: ${odbJobName} in ${folderName}`);
                return { success: true, message: `Job ${odbJobName} already completed` };
            }
            
            // Step 3: Recursively resolve dependencies (old_job)
            if (jobData.old_job && jobData.old_job !== '-') {
                console.log(`Step 3: Resolving dependency "${jobData.old_job}" for job "${actualJobName}"`);
                
                // Recursively resolve the dependency first (backtracking approach)
                const dependencyResult = await resolveDependencies(jobData.old_job, visitedJobs, { p: jobData.p, l: jobData.l });
                if (!dependencyResult.success) {
                    throw new Error(`Failed to resolve dependency ${jobData.old_job}: ${dependencyResult.message}`);
                }
            } else {
                console.log(`Step 3: No dependencies for job "${actualJobName}" (old_job: ${jobData.old_job})`);
            }
            
            // Step 4: Execute current job after all dependencies are resolved
            console.log(`Step 4: Executing job "${odbJobName}" in folder ${folderName}...`);
            const executeResult = await executeAbaqusJob(folderPath, odbJobName, jobData.old_job);
            if (!executeResult.success) {
                throw new Error(`Failed to execute job ${odbJobName}: ${executeResult.message}`);
            }
            
            console.log(`✓ Successfully executed job "${odbJobName}"`);
            return { success: true, message: `Job ${odbJobName} executed successfully` };
            
        } catch (error) {
            console.error(`Error resolving dependencies for ${jobName}:`, error);
            throw error;
        }
    }
      // Helper function to find job in specific folder
    async function findJobInFolder(jobName, p, l) {
        const searchNames = [
            jobName,
            jobName.endsWith('.inp') ? jobName.replace('.inp', '') : jobName + '.inp'
        ];
        
        for (const searchName of searchNames) {
            const query = `SELECT p, l, job, old_job FROM ${tableName} WHERE job = $1 AND p = $2 AND l = $3`;
            const result = await db.query(query, [searchName, p, l]);
            if (result.rows.length > 0) {
                return result.rows[0];
            }
        }
        return null;
    }// Function to execute Abaqus job with enhanced dependency handling
    function executeAbaqusJob(folderPath, jobName, oldJobName) {
        return new Promise((resolve) => {
            try {
                // Ensure job names are clean (without .inp for command execution)
                const cleanJobName = jobName.endsWith('.inp') ? jobName.replace('.inp', '') : jobName;
                
                let command;
                // Handle cases where old_job exists vs doesn't exist
                if (oldJobName && oldJobName !== '-') {
                    const cleanOldJobName = oldJobName.endsWith('.inp') ? oldJobName.replace('.inp', '') : oldJobName;
                    command = `abaqus job=${cleanJobName} oldjob=${cleanOldJobName} input=${cleanJobName}.inp`;
                    console.log(`Executing with dependency: ${command}`);
                } else {
                    command = `abaqus job=${cleanJobName} input=${cleanJobName}.inp`;
                    console.log(`Executing without dependency: ${command}`);
                }
                
                console.log(`Working directory: ${folderPath}`);
                
                const abaqusProcess = spawn('cmd', ['/c', command], {
                    cwd: folderPath,
                    shell: true
                });
                
                let output = '';
                let errorOutput = '';
                
                abaqusProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                abaqusProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                
                abaqusProcess.on('close', (code) => {
                    console.log(`Process finished with exit code: ${code}`);
                    if (code === 0) {
                        resolve({ success: true, output: output });
                    } else {
                        resolve({ 
                            success: false, 
                            message: `Process exited with code ${code}`,
                            error: errorOutput,
                            output: output
                        });
                    }
                });
                
                abaqusProcess.on('error', (error) => {
                    console.error(`Process spawn error: ${error.message}`);
                    resolve({ 
                        success: false, 
                        message: `Failed to start process: ${error.message}` 
                    });
                });
                
            } catch (error) {
                console.error(`Function execution error: ${error.message}`);
                resolve({ 
                    success: false, 
                    message: `Error executing job: ${error.message}` 
                });
            }
        });
    }
    
    // Start the dependency resolution process
    (async () => {
        try {
            // Get the initial job data
            const query = `SELECT p, l, job, old_job FROM ${tableName} WHERE number_of_runs = $1`;
            const result = await db.query(query, [runNumber]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Row not found'
                });
            }
            
            const rowData = result.rows[0];
            
            if (!fs.existsSync(projectPath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Project folder not found'
                });
            }
              console.log(`Starting dependency resolution for job: ${rowData.job} in context P${rowData.p}_L${rowData.l}`);
            // Pass the initial job's context to help with dependency resolution
            const initialContext = { p: rowData.p, l: rowData.l };
            await resolveDependencies(rowData.job, new Set(), initialContext);
            
            res.json({
                success: true,
                message: `Job ${rowData.job} and all dependencies executed successfully`
            });
            
        } catch (error) {
            console.error('Error in dependency resolution:', error);
            res.status(500).json({
                success: false,
                message: `Error resolving dependencies: ${error.message}`
            });
        }
    })();
});

// Add endpoint for checking job completion status more comprehensively
app.get('/api/check-job-status', (req, res) => {
    const { projectName, protocol, folderName, jobName } = req.query;
    
    if (!projectName || !protocol || !folderName || !jobName) {
        return res.status(400).json({
            success: false,
            message: 'All parameters are required'
        });
    }
      const combinedFolderName = `${projectName}_${protocol}`;
    const jobPath = path.join(__dirname, 'projects', combinedFolderName, folderName);
    
    try {
        // Check for various file types to determine job status
        const odbFile = path.join(jobPath, `${jobName}.odb`);
        const staFile = path.join(jobPath, `${jobName}.sta`);
        const msgFile = path.join(jobPath, `${jobName}.msg`);
        
        let status = 'not_started';
        let message = '';
        
        if (fs.existsSync(odbFile)) {
            status = 'completed';
            message = 'Job completed successfully - ODB file exists';
        } else if (fs.existsSync(staFile)) {
            // Check status file content
            try {
                const staContent = fs.readFileSync(staFile, 'utf8');
                if (staContent.includes('COMPLETED')) {
                    status = 'completed';
                    message = 'Job completed according to status file';
                } else if (staContent.includes('ABORTED') || staContent.includes('ERROR')) {
                    status = 'error';
                    message = 'Job aborted or encountered error';
                } else {
                    status = 'running';
                    message = 'Job is currently running';
                }
            } catch (readErr) {
                status = 'running';
                message = 'Status file exists but could not be read';
            }
        } else if (fs.existsSync(msgFile)) {
            status = 'running';
            message = 'Job started - message file exists';
        }
        
        res.json({
            success: true,
            status: status,
            message: message,
            files: {
                odb: fs.existsSync(odbFile),
                sta: fs.existsSync(staFile),
                msg: fs.existsSync(msgFile)
            }
        });
        
    } catch (err) {
        console.error('Error checking job status:', err);
        res.status(500).json({
            success: false,
            message: 'Error checking job status: ' + err.message
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