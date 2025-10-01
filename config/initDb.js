const pool = require('./db');

// Define the expected table structure
const tableSchemas = {
  patient: [
    'id INT AUTO_INCREMENT PRIMARY KEY',
    'cr_id VARCHAR(255) NOT NULL',
    'name VARCHAR(255) NOT NULL',
    'gender VARCHAR(255) NOT NULL',
    'birthdate VARCHAR(255) NOT NULL',
    'national_id VARCHAR(255)',
    'email VARCHAR(255)',
    'system_value VARCHAR(255)',
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  ],
  provider: [
    'id INT AUTO_INCREMENT PRIMARY KEY',
    'f_id VARCHAR(255) NOT NULL',
    'name VARCHAR(255) NOT NULL UNIQUE',
    'level VARCHAR(255) NOT NULL',
    'slade_code VARCHAR(255)',
    'status INT',
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  ],
  practitioner: [
    'id INT AUTO_INCREMENT PRIMARY KEY',
    'pu_id VARCHAR(255) NOT NULL',
    'phone VARCHAR(255)',
    'email VARCHAR(255)',
    'address VARCHAR(255)',
    'gender VARCHAR(255) NOT NULL',
    'national_id VARCHAR(255)',
    'status INT',
    'name VARCHAR(255) NOT NULL',
    'slade_code VARCHAR(255)',
    'reg_number VARCHAR(255)',
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  ],
  package: [
    'id INT AUTO_INCREMENT PRIMARY KEY',
    'code VARCHAR(255) NOT NULL UNIQUE',
    'name VARCHAR(255)',
    'is_preauth TINYINT(1) NOT NULL DEFAULT 0',
    'created_by VARCHAR(255)',
    'updated_by VARCHAR(255)',
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  ],
  intervention: [
    'id INT AUTO_INCREMENT PRIMARY KEY',
    'package_id INT NOT NULL',
    'code VARCHAR(255) NOT NULL UNIQUE',
    'name VARCHAR(255)',
    'is_complex TINYINT(1) NOT NULL DEFAULT 0',
    'created_by VARCHAR(255)',
    'updated_by VARCHAR(255)',
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'FOREIGN KEY (package_id) REFERENCES package(id) ON DELETE CASCADE'
  ],
  testcase: [
    'id INT AUTO_INCREMENT PRIMARY KEY',
    'intervention_id INT NOT NULL',
    'name VARCHAR(255) NOT NULL UNIQUE',
    'description TEXT',
    'test_config JSON NOT NULL',
    'code VARCHAR(255) NOT NULL',
    'created_by VARCHAR(255)',
    'updated_by VARCHAR(255)',
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'FOREIGN KEY (intervention_id) REFERENCES intervention(id) ON DELETE CASCADE'
  ],
  result: [
    'id INT AUTO_INCREMENT PRIMARY KEY',
    'testcase_id INT NOT NULL',
    'result_status INT NOT NULL',
    'claim_id VARCHAR(255)',
    'response_id VARCHAR(255)',
    'status_code VARCHAR(255)',
    'message TEXT',
    'detail TEXT',
    'created_by VARCHAR(255)',
    'updated_by VARCHAR(255)',
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'FOREIGN KEY (testcase_id) REFERENCES testcase(id) ON DELETE CASCADE'
  ]
};

// Function to get existing columns for a table
async function getExistingColumns(tableName) {
  try {
    const [rows] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ?
    `, [tableName]);

    return rows.map(row => row.COLUMN_NAME);
  } catch (error) {
    console.error(`Error getting columns for table ${tableName}:`, error);
    return [];
  }
}

// Function to extract column name from schema definition
function extractColumnName(columnDef) {
  // Remove constraints and extract the column name
  return columnDef.split(' ')[0].toLowerCase();
}

// Function to add missing columns to a table
async function addMissingColumns(tableName, expectedColumns, existingColumns) {
  for (const columnDef of expectedColumns) {
    const columnName = extractColumnName(columnDef);

    // Skip if it's a foreign key constraint or primary key
    if (columnDef.toLowerCase().includes('foreign key') ||
      columnDef.toLowerCase().includes('primary key')) {
      continue;
    }

    if (!existingColumns.includes(columnName)) {
      try {
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`);
        console.log(`Added column ${columnName} to table ${tableName}`);
      } catch (error) {
        console.error(`Error adding column ${columnName} to table ${tableName}:`, error);
      }
    }
  }
}

// Function to check and add foreign key constraints
async function checkForeignKeyConstraints(tableName, expectedColumns, existingColumns) {
  for (const columnDef of expectedColumns) {
    if (columnDef.toLowerCase().includes('foreign key')) {
      const match = columnDef.match(/FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s*(\w+)\((\w+)\)/i);
      if (match) {
        const [, columnName, refTable, refColumn] = match;

        // Check if foreign key already exists
        const [existingFKs] = await pool.query(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND COLUMN_NAME = ? 
          AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [tableName, columnName]);

        if (existingFKs.length === 0) {
          try {
            const fkName = `fk_${tableName}_${columnName}`;
            await pool.query(`ALTER TABLE ${tableName} ADD CONSTRAINT ${fkName} ${columnDef}`);
            console.log(`Added foreign key constraint for ${columnName} in table ${tableName}`);
          } catch (error) {
            console.error(`Error adding foreign key constraint for ${columnName} in table ${tableName}:`, error);
          }
        }
      }
    }
  }
}

async function initializeDatabase() {
  try {
    // Create tables if they don't exist first
    for (const [tableName, schema] of Object.entries(tableSchemas)) {
      const columnDefinitions = schema.filter(def =>
        !def.toLowerCase().includes('foreign key')
      ).join(', ');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefinitions})
      `);
      console.log(`Table ${tableName} checked/created`);
    }

    // Now check and add missing columns for each table
    for (const [tableName, expectedSchema] of Object.entries(tableSchemas)) {
      const existingColumns = await getExistingColumns(tableName);
      await addMissingColumns(tableName, expectedSchema, existingColumns);
      await checkForeignKeyConstraints(tableName, expectedSchema, existingColumns);
    }

    console.log('Database initialization and update completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = initializeDatabase;