const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'apollo_tyres',
    password: '0306',
    port: 5432,
});

async function checkJobLocations() {
    try {
        await client.connect();
        console.log('Connected to database');
        
        const query = 'SELECT number_of_runs, p, l, job, old_job FROM mf_data WHERE number_of_runs IN (1, 2) ORDER BY number_of_runs';
        const result = await client.query(query);
        
        console.log('\nDatabase entries for Run 1 and 2:');
        result.rows.forEach(row => {
            console.log(`Run ${row.number_of_runs}: Folder=${row.p}_${row.l}, Job=${row.job}, Old_Job=${row.old_job}`);
        });
        
        // Also check if the dependency job exists
        console.log('\nChecking for dependency job "rollingtire_brake_trac":');
        const depQuery = `SELECT number_of_runs, p, l, job, old_job FROM mf_data WHERE job = 'rollingtire_brake_trac' OR job = 'rollingtire_brake_trac.inp'`;
        const depResult = await client.query(depQuery);
        
        if (depResult.rows.length > 0) {
            depResult.rows.forEach(row => {
                console.log(`Found in Run ${row.number_of_runs}: Folder=${row.p}_${row.l}, Job=${row.job}, Old_Job=${row.old_job}`);
            });
        } else {
            console.log('Dependency job not found with exact name match');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

checkJobLocations();
