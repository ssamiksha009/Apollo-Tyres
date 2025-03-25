const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const rimraf = require('rimraf');  // Add this at the top with other requires

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
            number_of_runs INT,
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
            test_velocity VARCHAR(255)
        )
    `;

    db.query(createMF52DataTable, (err) => {
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
            cleat_orientation VARCHAR(255)
        )
    `;

    db.query(createFTireDataTable, (err) => {
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
            road_surface VARCHAR(255)
        )
    `;

    db.query(createCDTireDataTable, (err) => {
        if (err) {
            console.error('Error creating cdtire_data table:', err);
            return;
        }
        console.log('CDTire data table created successfully');
    });
});

// Secret key for JWT
const JWT_SECRET = 'apollo-tyres-secret-key'; // In production, use environment variable


// ...existing code...
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

// Add these utility functions after other middleware definitions
function clearAbaqusFolder() {
    const abaqusPath = path.join(__dirname, 'abaqus');
    if (fs.existsSync(abaqusPath)) {
        rimraf.sync(abaqusPath);
    }
    fs.mkdirSync(abaqusPath, { recursive: true });
}

function createRunFolders(data) {
    const abaqusPath = path.join(__dirname, 'abaqus');
    
    // Get unique run numbers
    const uniqueRuns = [...new Set(data.map(row => row.number_of_runs))];
    
    // Create folders for each unique run number
    uniqueRuns.forEach(runNumber => {
        const runPath = path.join(abaqusPath, runNumber.toString());
        if (!fs.existsSync(runPath)) {
            fs.mkdirSync(runPath, { recursive: true });
        }
    });
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

    // Clear and create Abaqus folders
    try {
        clearAbaqusFolder();
        createRunFolders(data);
    } catch (err) {
        console.error('Error managing folders:', err);
        return res.status(500).json({
            success: false,
            message: 'Error managing folders'
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

        // Rest of the existing store-excel-data logic
        const insertQuery = `
            INSERT INTO mf_data 
            (number_of_runs, tests, ips, loads, ias, sa_range, sr_range, test_velocity)
            VALUES ?
        `;

        const values = data.map(row => [
            row.number_of_runs,
            row.tests,
            row.ips,
            row.loads,
            row.ias,
            row.sa_range,
            row.sr_range,
            row.test_velocity
        ]);

        db.query(insertQuery, [values], (err, result) => {
            if (err) {
                console.error('Error storing data:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error storing data'
                });
            }

            res.json({
                success: true,
                message: 'Data stored successfully'
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
        res.json(results);
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
        res.json(results);
    });
});

// Add new endpoint for generating parameter file
app.post('/api/generate-parameters', (req, res) => {
    try {
        const data = req.body;
        const templatePath = path.join(__dirname, 'parameters1.inc');
        const outputPath = path.join(__dirname, 'parameters.inc');

        // Read template file
        let content = fs.readFileSync(templatePath, 'utf8');

        // Replace values
        content = content.replace('load1_kg=', `load1_kg=${data.load1_kg}`)
                        .replace('load2_kg=', `load2_kg=${data.load2_kg}`)
                        .replace('load3_kg=', `load3_kg=${data.load3_kg}`)
                        .replace('pressure1=', `pressure1=${data.pressure1}`)
                        .replace('pressure2=', `pressure2=${data.pressure2}`)
                        .replace('pressure3=', `pressure3=${data.pressure3}`)
                        .replace('speed_kmph=', `speed_kmph=${data.speed_kmph}`)
                        .replace('IA=', `IA=${data.IA}`)
                        .replace('SA=', `SA=${data.SA}`)
                        .replace('SR=', `SR=${data.SR}`)
                        .replace('width=', `width=${data.width}`)
                        .replace('diameter=', `diameter=${data.diameter}`);

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

        const insertQuery = `
            INSERT INTO mf52_data 
            (number_of_runs, tests, inflation_pressure, loads, inclination_angle, 
             slip_angle, slip_ratio, test_velocity)
            VALUES ?
        `;

        const values = data.map(row => [
            row.number_of_runs,
            row.tests,
            row.inflation_pressure,
            row.loads,
            row.inclination_angle,
            row.slip_angle,
            row.slip_ratio,
            row.test_velocity
        ]);

        db.query(insertQuery, [values], (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error storing data'
                });
            }

            res.json({
                success: true,
                message: 'Data stored successfully'
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
        res.json(results);
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

        const insertQuery = `
            INSERT INTO ftire_data 
            (number_of_runs, tests, loads, inflation_pressure, test_velocity,
             longitudinal_slip, slip_angle, inclination_angle, cleat_orientation)
            VALUES ?
        `;

        const values = data.map(row => [
            row.number_of_runs || 0,
            row.tests || '',
            row.loads || '',
            row.inflation_pressure || '',
            row.test_velocity || '',
            row.longitudinal_slip || '',
            row.slip_angle || '',
            row.inclination_angle || '',
            row.cleat_orientation || ''
        ]);

        db.query(insertQuery, [values], (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error storing data'
                });
            }

            res.json({
                success: true,
                message: 'Data stored successfully'
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
        res.json(results);
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
        res.json(results || []); // Return empty array if no results
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

        const insertQuery = `
            INSERT INTO cdtire_data 
            (number_of_runs, test_name, inflation_pressure, velocity, preload,
             camber, slip_angle, displacement, slip_range, cleat, road_surface)
            VALUES ?
        `;

        const values = data.map(row => [
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
            row.road_surface || ''
        ]);

        db.query(insertQuery, [values], (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error storing data'
                });
            }
            res.json({
                success: true,
                message: 'Data stored successfully'
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
        res.json(results);
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
        res.json(results || []); // Return empty array if no results
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