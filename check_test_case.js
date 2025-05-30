const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'apollo_tyres',
  password: '0306',
  port: 5432,
});

async function checkTestCase() {
  try {
    console.log('Checking runs 1 and 2 specifically:');
    const query = `
      SELECT number_of_runs, p, l, job, old_job 
      FROM mf_data 
      WHERE number_of_runs IN (1, 2)
      ORDER BY number_of_runs
    `;
    
    const result = await pool.query(query);
    result.rows.forEach(row => {
      console.log(`Run ${row.number_of_runs}:`);
      console.log(`  Folder: ${row.p}_${row.l}`);
      console.log(`  Job: "${row.job}"`);
      console.log(`  Old Job: "${row.old_job}"`);
      console.log();
    });
    
    // Check if the dependency job exists with the exact name
    console.log('Searching for exact dependency job "rollingtire_brake_trac":');
    const depQuery = `
      SELECT number_of_runs, p, l, job, old_job 
      FROM mf_data 
      WHERE job = 'rollingtire_brake_trac'
      ORDER BY number_of_runs
    `;
    
    const depResult = await pool.query(depQuery);
    console.log(`Found ${depResult.rows.length} matches:`);
    depResult.rows.forEach(row => {
      console.log(`  Run ${row.number_of_runs}: ${row.p}_${row.l}, old_job: "${row.old_job}"`);
    });
    
    // Check if the dependency job exists with .inp extension
    console.log('\nSearching for dependency job "rollingtire_brake_trac.inp":');
    const depQueryInp = `
      SELECT number_of_runs, p, l, job, old_job 
      FROM mf_data 
      WHERE job = 'rollingtire_brake_trac.inp'
      ORDER BY number_of_runs
    `;
    
    const depResultInp = await pool.query(depQueryInp);
    console.log(`Found ${depResultInp.rows.length} matches:`);
    depResultInp.rows.forEach(row => {
      console.log(`  Run ${row.number_of_runs}: ${row.p}_${row.l}, old_job: "${row.old_job}"`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkTestCase();
