const fetch = require('node-fetch');

async function testAPIs() {
  const baseUrl = 'http://localhost:3000/api';
  const userId = 'test-user';
  
  console.log('🧪 Testing API endpoints...\n');
  
  // Test generate-examples GET
  try {
    console.log('📚 Testing generate-examples GET...');
    const response = await fetch(`${baseUrl}/generate-examples?userId=${userId}`);
    const data = await response.json();
    console.log('Response:', data);
    console.log('✅ Generate-examples GET working\n');
  } catch (error) {
    console.error('❌ Generate-examples GET failed:', error.message);
  }
  
  // Test generate-etymology GET
  try {
    console.log('🔍 Testing generate-etymology GET...');
    const response = await fetch(`${baseUrl}/generate-etymology?userId=${userId}`);
    const data = await response.json();
    console.log('Response:', data);
    console.log('✅ Generate-etymology GET working\n');
  } catch (error) {
    console.error('❌ Generate-etymology GET failed:', error.message);
  }
}

// Wait for server to start
setTimeout(() => {
  testAPIs();
}, 3000);