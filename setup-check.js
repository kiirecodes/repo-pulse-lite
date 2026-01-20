#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 RepoPulse Lite Setup Verification\n');

// Check required files
const requiredFiles = [
  'server/index.js',
  'server/config.js',
  'server/auth.js',
  'server/githubService.js',
  'client/src/App.jsx',
  'client/src/Dashboard.jsx',
  'client/src/api.js',
  'client/package.json',
  'package.json',
  '.env.example',
  'README.md'
];

let allFilesExist = true;

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check .env file
console.log('\n🔐 Checking environment configuration...');
if (fs.existsSync('.env')) {
  console.log('✅ .env file exists');
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredEnvVars = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'SESSION_SECRET'];
  
  requiredEnvVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`)) {
      console.log(`✅ ${varName} is configured`);
    } else {
      console.log(`⚠️  ${varName} needs to be configured`);
    }
  });
} else {
  console.log('❌ .env file not found');
  console.log('💡 Copy .env.example to .env and configure your GitHub OAuth credentials');
}

// Check node_modules
console.log('\n📦 Checking dependencies...');
if (fs.existsSync('node_modules') && fs.existsSync('client/node_modules')) {
  console.log('✅ Dependencies installed');
} else {
  console.log('❌ Dependencies not installed');
  console.log('💡 Run: npm run install-all');
}

// Summary
console.log('\n📋 Summary:');
if (allFilesExist) {
  console.log('✅ All required files are present');
} else {
  console.log('❌ Some files are missing');
}

console.log('\n🚀 Next steps:');
console.log('1. Configure your GitHub OAuth app');
console.log('2. Set up your .env file with GitHub credentials');
console.log('3. Install dependencies: npm run install-all');
console.log('4. Start the application: npm run dev');
console.log('5. Open http://localhost:3000 in your browser');
