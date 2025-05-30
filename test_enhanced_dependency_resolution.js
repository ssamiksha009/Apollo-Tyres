// Enhanced Dependency Resolution Test Script
// This script tests the cross-folder dependency resolution with backtracking

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'postgres',
    password: '0306',
    port: 5432,
    database: 'apollo_tyres'
};

const db = new Pool(dbConfig);

async function testEnhancedDependencyResolution() {
    console.log('=== Enhanced Dependency Resolution Test ===\n');
    
    try {
        // Test 1: Check current database state
        console.log('1. Checking current database state:');
        const query = 'SELECT number_of_runs, p, l, job, old_job FROM mf_data ORDER BY number_of_runs';
        const result = await db.query(query);
        
        console.log('Current jobs in database:');
        result.rows.forEach(row => {
            console.log(`  Run ${row.number_of_runs}: P${row.p}_L${row.l} - ${row.job} (depends on: ${row.old_job || 'none'})`);
        });
        
        // Test 2: Verify folder structure mapping
        console.log('\n2. Verifying folder structure:');
        const projectPath = path.join(__dirname, 'abaqus', 'ac_MF62');
        
        if (fs.existsSync(projectPath)) {
            const folders = fs.readdirSync(projectPath);
            console.log('Available folders:');
            folders.forEach(folder => {
                console.log(`  ${folder}`);
                // Check for .inp and .odb files in each folder
                const folderPath = path.join(projectPath, folder);
                if (fs.statSync(folderPath).isDirectory()) {
                    const files = fs.readdirSync(folderPath);
                    const inpFiles = files.filter(f => f.endsWith('.inp'));
                    const odbFiles = files.filter(f => f.endsWith('.odb'));
                    console.log(`    .inp files: ${inpFiles.join(', ') || 'none'}`);
                    console.log(`    .odb files: ${odbFiles.join(', ') || 'none'}`);
                }
            });
        } else {
            console.log('Project folder not found!');
        }
        
        // Test 3: Simulate cross-folder dependency scenarios
        console.log('\n3. Testing cross-folder dependency scenarios:');
        
        // Test scenario 1: Job in one folder depends on job in another folder
        console.log('\nScenario 1: Cross-folder dependency');
        await testCrossFolderDependency();
        
        // Test scenario 2: Chain of dependencies across multiple folders
        console.log('\nScenario 2: Multi-folder dependency chain');
        await testMultiFolderDependencyChain();
        
        // Test scenario 3: Job without dependencies
        console.log('\nScenario 3: Job without dependencies');
        await testJobWithoutDependencies();
        
        // Test scenario 4: Circular dependency detection
        console.log('\nScenario 4: Circular dependency detection');
        await testCircularDependencyDetection();
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await db.end();
    }
}

async function testCrossFolderDependency() {
    console.log('Testing scenario where job in P1_L1 depends on job in P2_L2...');
    
    // Check if we have jobs that span multiple folders
    const query = `
        SELECT DISTINCT p, l, job, old_job 
        FROM mf_data 
        WHERE old_job IS NOT NULL AND old_job != '-'
        ORDER BY p, l
    `;
    const result = await db.query(query);
    
    if (result.rows.length > 0) {
        console.log('Jobs with dependencies found:');
        result.rows.forEach(row => {
            console.log(`  ${row.job} in P${row.p}_L${row.l} depends on ${row.old_job}`);
        });
        
        // Check if dependencies exist in different folders
        for (const row of result.rows) {
            const depQuery = `
                SELECT p, l, job 
                FROM mf_data 
                WHERE job = $1 AND (p != $2 OR l != $3)
            `;
            const depResult = await db.query(depQuery, [row.old_job, row.p, row.l]);
            
            if (depResult.rows.length > 0) {
                console.log(`  ✓ Cross-folder dependency detected: ${row.old_job} found in different folder(s)`);
                depResult.rows.forEach(dep => {
                    console.log(`    Found in P${dep.p}_L${dep.l}`);
                });
            }
        }
    } else {
        console.log('No jobs with dependencies found for cross-folder testing');
    }
}

async function testMultiFolderDependencyChain() {
    console.log('Testing dependency chains across multiple folders...');
    
    // Find jobs that form dependency chains
    const chainQuery = `
        WITH RECURSIVE dependency_chain AS (
            -- Start with jobs that have dependencies
            SELECT job, old_job, p, l, 1 as depth
            FROM mf_data
            WHERE old_job IS NOT NULL AND old_job != '-'
            
            UNION ALL
            
            -- Recursively find dependencies of dependencies
            SELECT m.job, m.old_job, m.p, m.l, dc.depth + 1
            FROM mf_data m
            JOIN dependency_chain dc ON m.job = dc.old_job
            WHERE dc.depth < 5  -- Prevent infinite recursion
        )
        SELECT * FROM dependency_chain
        ORDER BY depth, job
    `;
    
    const chainResult = await db.query(chainQuery);
    
    if (chainResult.rows.length > 0) {
        console.log('Dependency chains found:');
        let currentChain = [];
        let currentDepth = 1;
        
        chainResult.rows.forEach(row => {
            if (row.depth !== currentDepth) {
                if (currentChain.length > 0) {
                    console.log(`  Chain: ${currentChain.join(' → ')}`);
                }
                currentChain = [];
                currentDepth = row.depth;
            }
            currentChain.push(`${row.job}(P${row.p}_L${row.l})`);
        });
        
        if (currentChain.length > 0) {
            console.log(`  Chain: ${currentChain.join(' → ')}`);
        }
    } else {
        console.log('No dependency chains found');
    }
}

async function testJobWithoutDependencies() {
    console.log('Testing jobs without dependencies...');
    
    const query = `
        SELECT p, l, job, old_job 
        FROM mf_data 
        WHERE old_job IS NULL OR old_job = '-'
        ORDER BY p, l
    `;
    const result = await db.query(query);
    
    console.log(`Found ${result.rows.length} jobs without dependencies:`);
    result.rows.forEach(row => {
        console.log(`  ${row.job} in P${row.p}_L${row.l}`);
    });
}

async function testCircularDependencyDetection() {
    console.log('Testing circular dependency detection...');
    
    // Look for potential circular dependencies
    const circularQuery = `
        WITH RECURSIVE dependency_path AS (
            SELECT job, old_job, p, l, ARRAY[job] as path, 1 as depth
            FROM mf_data
            WHERE old_job IS NOT NULL AND old_job != '-'
            
            UNION ALL
            
            SELECT m.job, m.old_job, m.p, m.l, 
                   dp.path || m.job, dp.depth + 1
            FROM mf_data m
            JOIN dependency_path dp ON m.job = dp.old_job
            WHERE NOT (m.job = ANY(dp.path)) AND dp.depth < 10
        )
        SELECT DISTINCT job, old_job, path, depth
        FROM dependency_path
        WHERE job = ANY(path[1:array_length(path,1)-1])
        ORDER BY depth
    `;
    
    const circularResult = await db.query(circularQuery);
    
    if (circularResult.rows.length > 0) {
        console.log('Potential circular dependencies detected:');
        circularResult.rows.forEach(row => {
            console.log(`  ${row.path.join(' → ')} (circular!)`);
        });
    } else {
        console.log('No circular dependencies detected ✓');
    }
}

// Test the enhanced dependency resolution by simulating the server logic
async function simulateDependencyResolution(jobName, visitedJobs = new Set(), callerContext = null) {
    console.log(`\n=== Simulating dependency resolution for job: ${jobName} ===`);
    
    if (visitedJobs.has(jobName)) {
        console.log(`Circular dependency detected for job: ${jobName}, skipping`);
        return { success: true, message: `Circular dependency avoided for ${jobName}` };
    }
    visitedJobs.add(jobName);
    
    const tableName = 'mf_data';
    let jobData = null;
    
    // Step 1: Try to find job in caller's context first
    if (callerContext) {
        console.log(`Step 1: Searching in caller's folder ${callerContext.p}_${callerContext.l}...`);
        const query = `SELECT p, l, job, old_job FROM ${tableName} WHERE job = $1 AND p = $2 AND l = $3`;
        const result = await db.query(query, [jobName, callerContext.p, callerContext.l]);
        if (result.rows.length > 0) {
            jobData = result.rows[0];
            console.log(`✓ Found "${jobData.job}" in same folder ${callerContext.p}_${callerContext.l}`);
        }
    }
    
    // Step 2: If not found in caller's context, search globally
    if (!jobData) {
        console.log(`Step 2: Job not found in caller's folder, searching globally...`);
        const globalQuery = `SELECT p, l, job, old_job FROM ${tableName} WHERE job = $1`;
        const globalResult = await db.query(globalQuery, [jobName]);
        if (globalResult.rows.length > 0) {
            jobData = globalResult.rows[0];
            console.log(`✓ Found "${jobData.job}" globally in folder ${jobData.p}_${jobData.l}`);
        } else {
            throw new Error(`Job "${jobName}" not found in any folder of the protocol`);
        }
    }
    
    // Step 3: Recursively resolve dependencies
    if (jobData.old_job && jobData.old_job !== '-') {
        console.log(`Step 3: Resolving dependency "${jobData.old_job}" for job "${jobData.job}"`);
        const dependencyResult = await simulateDependencyResolution(jobData.old_job, visitedJobs, { p: jobData.p, l: jobData.l });
        if (!dependencyResult.success) {
            throw new Error(`Failed to resolve dependency ${jobData.old_job}: ${dependencyResult.message}`);
        }
    } else {
        console.log(`Step 3: No dependencies for job "${jobData.job}" (old_job: ${jobData.old_job})`);
    }
    
    // Step 4: Simulate job execution
    console.log(`Step 4: Would execute job "${jobData.job}" in folder ${jobData.p}_${jobData.l}...`);
    return { success: true, message: `Job ${jobData.job} executed successfully` };
}

// Test specific scenarios with the actual algorithm
async function testSpecificScenarios() {
    console.log('\n=== Testing Specific Scenarios with Enhanced Algorithm ===\n');
    
    try {
        // Get a job with dependencies to test
        const jobQuery = `
            SELECT job, p, l 
            FROM mf_data 
            WHERE old_job IS NOT NULL AND old_job != '-' 
            LIMIT 1
        `;
        const jobResult = await db.query(jobQuery);
        
        if (jobResult.rows.length > 0) {
            const testJob = jobResult.rows[0];
            console.log(`Testing with job: ${testJob.job} from P${testJob.p}_L${testJob.l}`);
            
            const result = await simulateDependencyResolution(testJob.job, new Set(), { p: testJob.p, l: testJob.l });
            console.log('Test result:', result);
        } else {
            console.log('No jobs with dependencies found for testing');
        }
        
    } catch (error) {
        console.error('Scenario test error:', error);
    }
}

// Run all tests
async function runAllTests() {
    await testEnhancedDependencyResolution();
    await testSpecificScenarios();
}

runAllTests();
