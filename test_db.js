const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'apollo_tyres',
  password: '0306',
  port: 5432,
});

async function checkData() {
  try {
    console.log('Checking mf_data table structure...');
    const structureQuery = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mf_data' ORDER BY ordinal_position`;
    const structure = await pool.query(structureQuery);
    console.log('mf_data table structure:');
    structure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\nChecking sample data...');
    const dataQuery = 'SELECT number_of_runs, p, l, job, old_job FROM mf_data LIMIT 5';
    const data = await pool.query(dataQuery);
    console.log('Sample data from mf_data:');
    console.log(data.rows);
    
    // Check if project folders exist
    const fs = require('fs');
    const path = require('path');
    const abaqusPath = path.join(__dirname, 'abaqus');
    if (fs.existsSync(abaqusPath)) {
      console.log('\nExisting project folders:');
      const folders = fs.readdirSync(abaqusPath).filter(item => {
        return fs.statSync(path.join(abaqusPath, item)).isDirectory();
      });
      console.log(folders);
    } else {
      console.log('\nNo abaqus folder found');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkData();
