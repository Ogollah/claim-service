const pool = require('./db');

async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await pool.query(`
        CREATE TABLE IF NOT EXISTS patient (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cr_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        gender VARCHAR(255) NOT NULL,
        birthdate VARCHAR(255) NOT NULL,
        national_id VARCHAR(255),
        email VARCHAR(255),
        system_value VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS provider (
        id INT AUTO_INCREMENT PRIMARY KEY,
        f_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL UNIQUE,
        level VARCHAR(255) NOT NULL,
        slade_code VARCHAR(255),
        status INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS practitioner (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pu_id VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        email VARCHAR(255),
        address VARCHAR(255),
        gender VARCHAR(255) NOT NULL,
        national_id VARCHAR(255),
        status INT,
        name VARCHAR(255) NOT NULL,
        slade_code VARCHAR(255),
        reg_number VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS package (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS intervention (
        id INT AUTO_INCREMENT PRIMARY KEY,
        package_id INT NOT NULL,
        code VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (package_id) REFERENCES package(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS testcase (
        id INT AUTO_INCREMENT PRIMARY KEY,
        intervention_id INT NOT NULL,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        test_config JSON NOT NULL,
        code VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (intervention_id) REFERENCES intervention(id) ON DELETE CASCADE
      );
    `);    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = initializeDatabase;