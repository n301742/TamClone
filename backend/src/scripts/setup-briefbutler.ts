/**
 * BriefButler Setup Assistant
 * 
 * Interactive setup script to help configure the BriefButler integration:
 * - Extract certificate files
 * - Test API connection
 * - Update environment variables
 * 
 * Run with: npx ts-node src/scripts/setup-briefbutler.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import readline from 'readline';
import axios from 'axios';
import https from 'https';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load environment variables
const envFilePath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envFilePath });

// Default configuration
let config = {
  apiUrl: process.env.BRIEFBUTLER_API_URL || 'https://demodelivery.briefbutler.com',
  certPath: process.env.BRIEFBUTLER_CERTIFICATE_PATH || 'certificates/briefbutler-cert.pfx',
  certPassword: process.env.BRIEFBUTLER_CERTIFICATE_PASSWORD || 'foobar',
  mockMode: process.env.BRIEFBUTLER_TEST_MODE === 'true'
};

// Temp directory for PEM files
const TEMP_DIR = path.resolve(__dirname, '../../certs_temp');
const PEM_CERT_PATH = path.resolve(TEMP_DIR, 'certificate.pem');
const PEM_KEY_PATH = path.resolve(TEMP_DIR, 'private_key.pem');

/**
 * Main setup function
 */
async function setupBriefButler() {
  console.log('🚀 BriefButler Setup Assistant');
  console.log('===========================\n');
  
  // Display current configuration
  console.log('Current configuration:');
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Certificate path: ${config.certPath}`);
  console.log(`Certificate password: ${config.certPassword}`);
  console.log(`Mock mode: ${config.mockMode ? 'Enabled' : 'Disabled'}\n`);
  
  try {
    // Step 1: Update configuration
    await updateConfiguration();
    
    // Step 2: Validate certificate
    await validateCertificate();
    
    // Step 3: Extract PEM files
    await extractPemFiles();
    
    // Step 4: Test API connection
    await testApiConnection();
    
    // Step 5: Save configuration
    await saveConfiguration();
    
    console.log('\n✅ Setup completed successfully!');
    console.log('You can now use the BriefButler API integration.');
    console.log('To check the connection status any time, run:');
    console.log('  npx ts-node src/scripts/check-briefbutler-connection.ts');
    console.log('\nTo test endpoints interactively, run:');
    console.log('  npx ts-node src/scripts/test-api-endpoints.ts');
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

/**
 * Update configuration with user input
 */
async function updateConfiguration() {
  console.log('📝 Configuration Setup');
  console.log('---------------------');
  
  // Update API URL
  const apiUrl = await askQuestion(`Enter API URL [${config.apiUrl}]: `);
  if (apiUrl) config.apiUrl = apiUrl;
  
  // Update certificate path
  const certPath = await askQuestion(`Enter certificate path [${config.certPath}]: `);
  if (certPath) config.certPath = certPath;
  
  // Update certificate password
  const certPassword = await askQuestion(`Enter certificate password [${config.certPassword}]: `);
  if (certPassword) config.certPassword = certPassword;
  
  // Update mock mode
  const mockMode = await askQuestion(`Enable mock mode (yes/no) [${config.mockMode ? 'yes' : 'no'}]: `);
  if (mockMode) {
    config.mockMode = mockMode.toLowerCase() === 'yes' || mockMode.toLowerCase() === 'y';
  }
  
  console.log('\nUpdated configuration:');
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Certificate path: ${config.certPath}`);
  console.log(`Certificate password: ${config.certPassword}`);
  console.log(`Mock mode: ${config.mockMode ? 'Enabled' : 'Disabled'}\n`);
}

/**
 * Validate the certificate file
 */
async function validateCertificate() {
  console.log('🔒 Certificate Validation');
  console.log('-----------------------');
  
  const pfxPath = path.resolve(process.cwd(), config.certPath);
  console.log(`Checking certificate at: ${pfxPath}`);
  
  if (!fs.existsSync(pfxPath)) {
    console.error(`❌ Certificate file not found at: ${pfxPath}`);
    
    const createNew = await askQuestion('Do you want to create a directory for certificate? (yes/no): ');
    if (createNew.toLowerCase() !== 'yes' && createNew.toLowerCase() !== 'y') {
      throw new Error('Certificate file not found');
    }
    
    // Create certificate directory
    const certDir = path.dirname(pfxPath);
    if (!fs.existsSync(certDir)) {
      console.log(`Creating directory: ${certDir}`);
      fs.mkdirSync(certDir, { recursive: true });
    }
    
    console.log('\n⚠️ Important: You need to place your certificate file at:');
    console.log(pfxPath);
    console.log('Please copy your certificate file to this location before continuing.\n');
    
    const confirmed = await askQuestion('Have you copied the certificate file? (yes/no): ');
    if (confirmed.toLowerCase() !== 'yes' && confirmed.toLowerCase() !== 'y') {
      throw new Error('Certificate file not available');
    }
    
    if (!fs.existsSync(pfxPath)) {
      throw new Error('Certificate file still not found');
    }
  }
  
  console.log('✅ Certificate file found');
  
  // Validate certificate with OpenSSL
  try {
    console.log('Validating certificate...');
    execSync(`openssl pkcs12 -in "${pfxPath}" -info -noout -passin pass:${config.certPassword} 2>/dev/null`);
    console.log('✅ Certificate validation successful');
  } catch (error) {
    console.error('❌ Failed to validate certificate');
    console.error('This could be due to an incorrect password or corrupted certificate file.');
    
    const retry = await askQuestion('Do you want to retry with a different password? (yes/no): ');
    if (retry.toLowerCase() === 'yes' || retry.toLowerCase() === 'y') {
      const newPassword = await askQuestion('Enter certificate password: ');
      if (newPassword) {
        config.certPassword = newPassword;
        await validateCertificate();
      }
    } else {
      throw new Error('Certificate validation failed');
    }
  }
}

/**
 * Extract PEM files from the PFX certificate
 */
async function extractPemFiles() {
  console.log('\n📄 Extracting PEM Files');
  console.log('---------------------');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  const pfxPath = path.resolve(process.cwd(), config.certPath);
  
  try {
    // Extract certificate
    console.log(`Extracting certificate to: ${PEM_CERT_PATH}`);
    execSync(`openssl pkcs12 -in "${pfxPath}" -out "${PEM_CERT_PATH}" -clcerts -nokeys -legacy -passin pass:${config.certPassword} 2>/dev/null`);
    
    // Extract private key
    console.log(`Extracting private key to: ${PEM_KEY_PATH}`);
    execSync(`openssl pkcs12 -in "${pfxPath}" -out "${PEM_KEY_PATH}" -nocerts -legacy -passin pass:${config.certPassword} -passout pass:${config.certPassword} 2>/dev/null`);
    
    console.log('✅ PEM files extracted successfully');
  } catch (error: any) {
    console.error('❌ Failed to extract PEM files:', error.message);
    throw new Error('PEM extraction failed');
  }
}

/**
 * Test API connection
 */
async function testApiConnection() {
  console.log('\n📡 Testing API Connection');
  console.log('----------------------');
  
  if (config.mockMode) {
    console.log('⚠️ Mock mode is enabled. Skipping real API test.');
    return;
  }
  
  try {
    console.log(`Testing connection to: ${config.apiUrl}`);
    
    // Create HTTPS agent with certificate
    const cert = fs.readFileSync(PEM_CERT_PATH);
    const key = fs.readFileSync(PEM_KEY_PATH);
    
    const httpsAgent = new https.Agent({
      cert,
      key,
      passphrase: config.certPassword,
      rejectUnauthorized: false // Disable SSL verification for testing
    });
    
    // Create API client
    const apiClient = axios.create({
      baseURL: config.apiUrl,
      httpsAgent,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    try {
      // Try to connect to the API
      console.log('Making test request...');
      const response = await apiClient.get('/');
      console.log(`✅ Connection successful (status ${response.status})`);
    } catch (error: any) {
      if (error.response) {
        // Got a response, but not 2xx
        console.log(`⚠️ Received response with status ${error.response.status}`);
        console.log('This might be normal if the endpoint doesn\'t exist but the server is accessible.');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('❌ Connection refused. Server might be down or not reachable.');
        throw new Error('API connection failed: connection refused');
      } else {
        console.error('❌ Connection error:', error.message);
        
        const continueAnyway = await askQuestion('Do you want to continue anyway? (yes/no): ');
        if (continueAnyway.toLowerCase() !== 'yes' && continueAnyway.toLowerCase() !== 'y') {
          throw new Error('API connection failed');
        }
      }
    }
    
    // Try known endpoints from the API documentation
    const endpoints = [
      { url: '/letter', name: 'Letter Endpoint' },
      { url: '/status/test-tracking', name: 'Letter Status' },
      { url: '/profiles/test-user', name: 'User Profiles' }
    ];
    
    console.log('\nTesting documented API endpoints:');
    let foundWorkingEndpoint = false;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`- Testing ${endpoint.name} (GET ${endpoint.url})...`);
        const response = await apiClient.get(endpoint.url);
        console.log(`  ✅ Success (status ${response.status})`);
        foundWorkingEndpoint = true;
      } catch (error: any) {
        if (error.response) {
          console.log(`  ⚠️ Received status ${error.response.status}`);
        } else {
          console.log(`  ❌ Error: ${error.message}`);
        }
      }
    }
    
    if (!foundWorkingEndpoint) {
      console.log('\n⚠️ Could not find any working endpoints from the documentation.');
      console.log('This might be expected if:');
      console.log('- You need specific authentication credentials');
      console.log('- The API endpoints are different from the documentation');
      console.log('- The API requires specific request parameters');
      
      const continueAnyway = await askQuestion('Do you want to continue anyway? (yes/no): ');
      if (continueAnyway.toLowerCase() !== 'yes' && continueAnyway.toLowerCase() !== 'y') {
        throw new Error('No working API endpoints found');
      }
    }
  } catch (error: any) {
    if (error.message.includes('EOPNOTSUPP') || error.message.includes('operation not supported')) {
      console.error('❌ SSL/TLS negotiation failed. This might be due to:');
      console.error('- Incorrect certificate or private key');
      console.error('- Server requires specific TLS version or cipher suite');
      console.error('- Network issues blocking SSL/TLS connections');
      
      const enableMock = await askQuestion('Do you want to enable mock mode to continue? (yes/no): ');
      if (enableMock.toLowerCase() === 'yes' || enableMock.toLowerCase() === 'y') {
        config.mockMode = true;
        console.log('✅ Mock mode enabled');
      } else {
        throw new Error('SSL/TLS negotiation failed');
      }
    } else {
      throw error;
    }
  }
}

/**
 * Save configuration to .env file
 */
async function saveConfiguration() {
  console.log('\n💾 Saving Configuration');
  console.log('---------------------');
  
  try {
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, 'utf8');
    }
    
    // Update or add environment variables
    envContent = updateEnvVar(envContent, 'BRIEFBUTLER_API_URL', config.apiUrl);
    envContent = updateEnvVar(envContent, 'BRIEFBUTLER_CERTIFICATE_PATH', config.certPath);
    envContent = updateEnvVar(envContent, 'BRIEFBUTLER_CERTIFICATE_PASSWORD', config.certPassword);
    envContent = updateEnvVar(envContent, 'BRIEFBUTLER_TEST_MODE', config.mockMode ? 'true' : 'false');
    
    // Add a reference to the documentation
    if (!envContent.includes('# BriefButler API Configuration')) {
      envContent = 
`# BriefButler API Configuration
# See docs/api-reference/briefbutler-api.md for more information
${envContent}`;
    }
    
    // Save updated .env file
    fs.writeFileSync(envFilePath, envContent);
    console.log(`✅ Configuration saved to ${envFilePath}`);
    
    // Display summary
    console.log('\nConfiguration Summary:');
    console.log(`- API URL: ${config.apiUrl}`);
    console.log(`- Certificate Path: ${config.certPath}`);
    console.log(`- Certificate Password: ${config.certPassword}`);
    console.log(`- Mock Mode: ${config.mockMode ? 'Enabled' : 'Disabled'}`);
    
    // Create a backup of the .env file
    const backupPath = `${envFilePath}.backup`;
    fs.copyFileSync(envFilePath, backupPath);
    console.log(`✅ Backup created at ${backupPath}`);
  } catch (error: any) {
    console.error('❌ Failed to save configuration:', error.message);
    throw new Error('Failed to save configuration');
  }
}

/**
 * Helper function to update an environment variable in the .env content
 */
function updateEnvVar(content: string, name: string, value: string): string {
  const regex = new RegExp(`^${name}=.*$`, 'gm');
  const newLine = `${name}=${value}`;
  
  if (regex.test(content)) {
    // Update existing variable
    return content.replace(regex, newLine);
  } else {
    // Add new variable
    return `${content}\n${newLine}`;
  }
}

/**
 * Helper function to ask a question and get user input
 */
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the setup
setupBriefButler()
  .catch((error) => {
    console.error('\n💥 Unhandled error during setup:', error);
    process.exit(1);
  })
  .finally(() => {
    if (rl.listenerCount('line') > 0) {
      rl.close();
    }
  }); 