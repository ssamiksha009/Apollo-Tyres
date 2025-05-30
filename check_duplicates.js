const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'apollo_tyres',
  password: '0306',
  port: 5432,
});

async function checkDuplicateJobs() {
  try {
    console.log('Checking for duplicate job names in mf_data...');
    const duplicateQuery = `
      SELECT job, COUNT(*) as count, 
             STRING_AGG(CONCAT(p, '_', l, ' (run ', number_of_runs, ')'), ', ') as locations
      FROM mf_data 
      WHERE job IS NOT NULL AND job != ''
      GROUP BY job 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;
    
    const duplicates = await pool.query(duplicateQuery);
    console.log('Duplicate job names:');
    duplicates.rows.forEach(row => {
      console.log(`  ${row.job}: found ${row.count} times in ${row.locations}`);
    });
    
    // Check specific job that's causing issues
    console.log('\nSpecific job details for rollingtire_brake_trac:');
    const specificQuery = `
      SELECT number_of_runs, p, l, job, old_job 
      FROM mf_data 
      WHERE job = 'rollingtire_brake_trac'
      ORDER BY number_of_runs
    `;
    
    const specificResult = await pool.query(specificQuery);
    specificResult.rows.forEach(row => {
      console.log(`  Run ${row.number_of_runs}: ${row.p}_${row.l}, old_job: ${row.old_job}`);
    });
    
    // Check the full data for runs 1 and 2
    console.log('\nData for runs 1 and 2:');
    const runsQuery = `
      SELECT number_of_runs, p, l, job, old_job 
      FROM mf_data 
      WHERE number_of_runs IN (1, 2)
      ORDER BY number_of_runs
    `;
    
    const runsResult = await pool.query(runsQuery);
    runsResult.rows.forEach(row => {
      console.log(`  Run ${row.number_of_runs}: ${row.p}_${row.l}, job: ${row.job}, old_job: ${row.old_job}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkDuplicateJobs();
