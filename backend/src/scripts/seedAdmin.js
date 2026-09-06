const mysql = require('mysql2/promise');
const { hashPassword } = require('../utils/password');
require('../config/env');

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'BluewriteAdminn!2026';

async function seedAdmin() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bluewrite_db',
  });

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [ADMIN_USERNAME]);
    
    if (existing.length > 0) {
      console.log(`Admin user '${ADMIN_USERNAME}' already exists. Updating password...`);
      const hashedPassword = await hashPassword(ADMIN_PASSWORD);
      await pool.query('UPDATE users SET password_hash = ?, must_change_password = FALSE, account_locked = FALSE, failed_login_attempts = 0, locked_until = NULL WHERE username = ?', [hashedPassword, ADMIN_USERNAME]);
      console.log('Password updated successfully.');
    } else {
      console.log(`Creating admin user '${ADMIN_USERNAME}'...`);
      const hashedPassword = await hashPassword(ADMIN_PASSWORD);
      const [result] = await pool.query(
        'INSERT INTO users (username, password_hash, role, is_active, must_change_password) VALUES (?, ?, ?, ?, ?)',
        [ADMIN_USERNAME, hashedPassword, 'admin', 1, 0]
      );
      console.log(`Admin user created with ID: ${result.insertId}`);
    }
    
    const [verify] = await pool.query('SELECT id, username, role, account_locked, failed_login_attempts FROM users WHERE username = ?', [ADMIN_USERNAME]);
    console.log('Verified user:', verify[0]);
    
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await pool.end();
  }
}

seedAdmin();