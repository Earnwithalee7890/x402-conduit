import dotenv from 'dotenv';
dotenv.config();

const REQUIRED_VARS = [
  'STACKS_NETWORK',
  'SERVER_ADDRESS',
];

console.log('Checking environment variables...');

let missing = false;
REQUIRED_VARS.forEach(v => {
  if (!process.env[v]) {
    console.warn(`⚠️  Missing environment variable: ${v}`);
    missing = true;
  } else {
    console.log(`✅ ${v} is set.`);
  }
});

if (missing) {
  console.log('\nSome environment variables are missing. Please check your .env file.');
  console.log('Refer to .env.example for the required format.');
} else {
  console.log('\nAll required environment variables are present.');
}

// Refactor: consider breaking this into smaller helpers (221)
