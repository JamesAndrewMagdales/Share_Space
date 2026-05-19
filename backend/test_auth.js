// Test authentication flow completely
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
  // Connect to database
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    // 1. Get all users from database
    const [rows] = await conn.execute('SELECT id, email, first_name, is_active, password_hash FROM users');
    console.log(`Found ${rows.length} users:\n`);
    
    for (const user of rows) {
      console.log(`--- User: ${user.email} (id: ${user.id}) ---`);
      console.log(`Hash length: ${user.password_hash.length}`);
      console.log(`Hash prefix: ${user.password_hash.substring(0, 6)}`);
      console.log(`is_active: ${user.is_active}\n`);
    }

    // 2. Test: hash a password with bcryptjs, insert it, and verify it
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'mytestpassword123!';
    
    console.log('=== Creating test user with bcryptjs ===');
    const hash1 = await bcrypt.hash(testPassword, 12);
    console.log('Created hash:', hash1);
    console.log('Hash prefix:', hash1.substring(0, 6));
    
    await conn.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?)',
      [testEmail, hash1, 'Test', 'User', 1]
    );
    
    // 3. Verify login immediately
    const [newUser] = await conn.execute('SELECT * FROM users WHERE email = ?', [testEmail]);
    console.log('\n=== Verifying newly created user ===');
    console.log('Password valid:', await bcrypt.compare(testPassword, newUser[0].password_hash));
    console.log('Wrong password:', await bcrypt.compare('wrong', newUser[0].password_hash));
    
    // 4. Test EXISTING users with bcryptjs
    console.log('\n=== Testing existing DB users ===');
    for (const user of rows) {
      // Test common passwords
      const commonPasswords = ['password', 'password123', '123456', 'admin', 'Admin123!', 'test123', user.email.split('@')[0]];
      let matched = false;
      for (const pw of commonPasswords) {
        const result = await bcrypt.compare(pw, user.password_hash);
        if (result) {
          console.log(`MATCH: ${user.email} password = "${pw}"`);
          matched = true;
          break;
        }
      }
      if (!matched) {
        console.log(`NO MATCH: ${user.email} - password_hash format: ${user.password_hash.substring(0, 10)}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.end();
  }
}

run();
