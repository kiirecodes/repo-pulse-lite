#!/usr/bin/env node

console.log('🔍 Cloudflare Pages Setup Verification\n');

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check required files
const requiredFiles = [
  'functions/auth.js',
  'functions/callback.js',
  'functions/repos.js',
  'functions/pulls.js',
  'functions/issues.js',
  'functions/commits.js',
  'client/src/App.jsx',
  'client/src/Dashboard.jsx',
  'client/src/api.js',
  'client/package.json',
  'client/vite.config.js',
  'client/index.html',
  'wrangler.toml',
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

// Check dist directory
console.log('\n🏗️  Checking build output...');
if (fs.existsSync('dist')) {
  const distFiles = fs.readdirSync('dist');
  console.log('✅ dist/ directory exists with files:');
  distFiles.forEach(file => console.log(`   - ${file}`));
} else {
  console.log('❌ dist/ directory not found - run npm run build');
  allFilesExist = false;
}

// Check Functions syntax
console.log('\n⚡ Checking Cloudflare Functions syntax...');
const functionFiles = [
  'functions/auth.js',
  'functions/callback.js',
  'functions/repos.js',
  'functions/pulls.js',
  'functions/issues.js',
  'functions/commits.js'
];

functionFiles.forEach(file => {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    console.log(`✅ ${file} - Valid syntax`);
  } catch (error) {
    console.log(`❌ ${file} - Syntax error`);
    allFilesExist = false;
  }
});

// Check environment variables template
console.log('\n🔐 Checking environment configuration...');
if (fs.existsSync('.env.example')) {
  const envContent = fs.readFileSync('.env.example', 'utf8');
  const requiredVars = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_REDIRECT_URI'];  
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`✅ ${varName} template present`);
    } else {
      console.log(`❌ ${varName} missing from template`);
      allFilesExist = false;
    }
  });
} else {
  console.log('❌ .env.example not found');
  allFilesExist = false;
}

// Summary
console.log('\n📋 Summary:');
if (allFilesExist) {
  console.log('✅ All Cloudflare Pages requirements met!');
  console.log('\n🚀 Next steps:');
  console.log('1. Set up GitHub OAuth app');
  console.log('2. Configure environment variables');
  console.log('3. Deploy to Cloudflare Pages');
  console.log('   - CLI: npm run deploy');
  console.log('   - Git: Push to connected repository');
  console.log('\n🌐 Local development:');
  console.log('   npm run dev (starts both frontend and functions)');
  console.log('   Frontend: http://localhost:3000');
  console.log('   Functions: http://localhost:8787');
} else {
  console.log('❌ Some requirements not met');
  console.log('💡 Fix the issues above before deploying');
}

console.log('\n📚 Documentation: README.md');
console.log('🔧 Wrangler config: wrangler.toml');
