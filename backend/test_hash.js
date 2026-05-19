const bcrypt = require('bcryptjs');
const fs = require('fs');

const pw = 'testpassword123!';
console.log('=== Step 1: Creating hash with bcryptjs ===');
bcrypt.hash(pw, 12).then(hash => {
  console.log('Created hash:', hash);
  console.log('Hash length:', hash.length);
  // Save to file
  fs.writeFileSync('test_hash.json', JSON.stringify({password: pw, hash: hash}));
  
  console.log('\n=== Step 2: Verify same session ===');
  return bcrypt.compare(pw, hash);
}).then(result => {
  console.log('Same session verify:', result);
  
  // Wait a moment, then load from file in "new session"
  setTimeout(() => {
    console.log('\n=== Step 3: Verify from saved file ===');
    const data = JSON.parse(fs.readFileSync('test_hash.json', 'utf8'));
    console.log('Loaded hash:', data.hash);
    bcrypt.compare(data.password, data.hash).then(r => {
      console.log('Cross-file verify:', r);
      
      // Now test against DB hash
      console.log('\n=== Step 4: Test against DB hash ===');
      const dbHash = JSON.parse(fs.readFileSync('test_hash.json', 'utf8')).hash;
      // Let's use a hash that was actually created before
      // Test the db hashes read from file
    });
  }, 500);
});
