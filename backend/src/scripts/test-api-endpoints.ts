/**
 * BriefButler API Endpoint Test Script
 * 
 * This script tests the BriefButler API endpoints using the configured certificate.
 * It extracts the PEM files from the PFX certificate and uses them to authenticate.
 * 
 * Usage:
 *   npx ts-node src/scripts/test-api-endpoints.ts <endpoint> [method] [data]
 * 
 * Example:
 *   npx ts-node src/scripts/test-api-endpoints.ts status/test-123
 *   npx ts-node src/scripts/test-api-endpoints.ts letter post '{"profile_id":"test","recipient":{"name":"Test"}}'
 */

import axios, { AxiosRequestConfig, Method } from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuration
const API_BASE_URL = process.env.BRIEFBUTLER_API_URL || 'https://demodelivery.briefbutler.com';
const CERT_PATH = process.env.BRIEFBUTLER_CERTIFICATE_PATH || 'certificates/BB_Test_2024.p12';
const CERT_PASSWORD = process.env.BRIEFBUTLER_CERTIFICATE_PASSWORD || 'foobar';

// Temp directory for PEM files
const TEMP_DIR = path.resolve(__dirname, '../../certs_temp');
const PEM_CERT_PATH = path.resolve(TEMP_DIR, 'certificate.pem');
const PEM_KEY_PATH = path.resolve(TEMP_DIR, 'private_key.pem');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Extract PEM files from PFX certificate
 */
function extractPemFiles() {
  console.log('🔑 Extracting PEM files from certificate...');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  // Get absolute path to PFX file
  const pfxPath = path.resolve(process.cwd(), CERT_PATH);
  
  if (!fs.existsSync(pfxPath)) {
    console.error(`❌ Certificate file not found at: ${pfxPath}`);
    process.exit(1);
  }
  
  try {
    // Extract certificate
    console.log(`📄 Extracting certificate to: ${PEM_CERT_PATH}`);
    execSync(`openssl pkcs12 -in "${pfxPath}" -out "${PEM_CERT_PATH}" -clcerts -nokeys -legacy -passin pass:${CERT_PASSWORD}`);
    
    // Extract private key
    console.log(`🔐 Extracting private key to: ${PEM_KEY_PATH}`);
    execSync(`openssl pkcs12 -in "${pfxPath}" -out "${PEM_KEY_PATH}" -nocerts -legacy -passin pass:${CERT_PASSWORD} -passout pass:${CERT_PASSWORD}`);
    
    console.log('✅ PEM files extracted successfully');
  } catch (error: any) {
    console.error('❌ Failed to extract PEM files:', error.message);
    process.exit(1);
  }
}

/**
 * Create an authenticated API client
 */
function createApiClient() {
  // Check if PEM files exist
  if (!fs.existsSync(PEM_CERT_PATH) || !fs.existsSync(PEM_KEY_PATH)) {
    console.log('❓ PEM files not found, extracting from PFX certificate...');
    extractPemFiles();
  }
  
  // Read PEM files
  const cert = fs.readFileSync(PEM_CERT_PATH);
  const key = fs.readFileSync(PEM_KEY_PATH);
  
  // Create HTTPS agent with certificate
  const httpsAgent = new https.Agent({
    cert,
    key,
    passphrase: CERT_PASSWORD,
    rejectUnauthorized: false // Disable SSL verification for testing
  });
  
  // Create API client
  return axios.create({
    baseURL: API_BASE_URL,
    httpsAgent,
    timeout: 15000, // 15 seconds timeout
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  });
}

/**
 * Test API endpoint
 */
async function testEndpoint(endpoint: string, method: Method = 'get', data?: any) {
  console.log(`\n🧪 Testing endpoint: ${endpoint} with method: ${method.toUpperCase()}`);
  
  try {
    const apiClient = createApiClient();
    
    // Make request
    console.log(`📡 Making request to: ${API_BASE_URL}/${endpoint}`);
    const startTime = Date.now();
    
    const config: AxiosRequestConfig = {
      method,
      url: `/${endpoint}`
    };
    
    if (data && (method === 'post' || method === 'put' || method === 'patch')) {
      config.data = data;
      console.log(`📦 Request data:`, data);
    }
    
    const response = await apiClient.request(config);
    const duration = Date.now() - startTime;
    
    // Print response
    console.log(`\n⏱️  Response time: ${duration}ms`);
    console.log(`📥 Response status: ${response.status}`);
    console.log(`📤 Response headers:`, response.headers);
    console.log(`📦 Response data:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error: any) {
    console.error('\n❌ Error testing endpoint:', error.message);
    
    if (error.response) {
      console.log(`📥 Response status: ${error.response.status}`);
      console.log(`📤 Response headers:`, error.response.headers);
      console.log(`📦 Response data:`, error.response.data);
    } else if (error.code) {
      console.error(`🔧 Error code: ${error.code}`);
    }
    
    throw error;
  }
}

/**
 * Display a menu of common endpoints to test
 */
function displayMenu() {
  console.log('\n📋 Available endpoints to test:');
  console.log('  1. Root endpoint (GET /)');
  console.log('  2. Letter status (GET /status/{tracking_id})');
  console.log('  3. User profiles (GET /profiles/{user_id})');
  console.log('  4. Submit letter (POST /letter)');
  console.log('  5. Cancel letter (POST /cancel/{tracking_id})');
  console.log('  6. Custom endpoint');
  console.log('  7. Exit');
}

/**
 * Interactive prompt for endpoint testing
 */
async function interactiveMode() {
  try {
    while (true) {
      displayMenu();
      
      const choice = await new Promise<string>((resolve) => {
        rl.question('\n🔍 Enter your choice (1-7): ', resolve);
      });
      
      switch (choice) {
        case '1':
          await testEndpoint('');
          break;
          
        case '2': {
          const trackingId = await new Promise<string>((resolve) => {
            rl.question('Enter tracking ID (default: test-123): ', (answer) => resolve(answer || 'test-123'));
          });
          await testEndpoint(`status/${trackingId}`);
          break;
        }
          
        case '3': {
          const userId = await new Promise<string>((resolve) => {
            rl.question('Enter user ID (default: test-user): ', (answer) => resolve(answer || 'test-user'));
          });
          await testEndpoint(`profiles/${userId}`);
          break;
        }
          
        case '4': {
          console.log('\n📝 Creating a test letter submission...');
          
          // Use a simple test payload
          const data = {
            document: 'VGVzdCBQREYgQ29udGVudA==', // Base64 "Test PDF Content"
            profile_id: 'test-profile',
            recipient: {
              name: 'Test Recipient',
              address: 'Test Street 123',
              city: 'Test City',
              zip: '12345',
              country: 'AT'
            },
            options: {
              express: false,
              registered: true,
              color: false,
              duplex: true
            }
          };
          
          await testEndpoint('letter', 'post', data);
          break;
        }
          
        case '5': {
          const trackingId = await new Promise<string>((resolve) => {
            rl.question('Enter tracking ID to cancel: ', resolve);
          });
          
          if (!trackingId) {
            console.log('❌ Tracking ID is required');
            continue;
          }
          
          await testEndpoint(`cancel/${trackingId}`, 'post');
          break;
        }
          
        case '6': {
          const endpoint = await new Promise<string>((resolve) => {
            rl.question('Enter endpoint path: ', resolve);
          });
          
          if (!endpoint) {
            console.log('❌ Endpoint path is required');
            continue;
          }
          
          const method = await new Promise<Method>((resolve) => {
            rl.question('Enter method (get, post, put, delete) [default: get]: ', (answer) => {
              const m = (answer || 'get').toLowerCase() as Method;
              resolve(m);
            });
          });
          
          let data = undefined;
          if (method === 'post' || method === 'put' || method === 'patch') {
            const dataStr = await new Promise<string>((resolve) => {
              rl.question('Enter JSON data (optional): ', resolve);
            });
            
            if (dataStr) {
              try {
                data = JSON.parse(dataStr);
              } catch (error) {
                console.error('❌ Invalid JSON data');
                continue;
              }
            }
          }
          
          await testEndpoint(endpoint, method, data);
          break;
        }
          
        case '7':
          console.log('\n👋 Exiting...');
          rl.close();
          return;
          
        default:
          console.log('❌ Invalid choice');
      }
      
      await new Promise<void>((resolve) => {
        rl.question('\nPress Enter to continue...', () => resolve());
      });
    }
  } catch (error: any) {
    console.error('💥 Error in interactive mode:', error.message);
  } finally {
    rl.close();
  }
}

// Main function
async function main() {
  console.log('🚀 BriefButler API Endpoint Tester');
  console.log(`📡 API URL: ${API_BASE_URL}`);
  console.log(`📄 Certificate: ${CERT_PATH}`);
  
  // Get endpoint from command line
  const endpoint = process.argv[2];
  
  if (endpoint) {
    // Non-interactive mode
    const method = (process.argv[3] || 'get').toLowerCase() as Method;
    let data = undefined;
    
    if (process.argv[4]) {
      try {
        data = JSON.parse(process.argv[4]);
      } catch (error) {
        console.error('❌ Invalid JSON data');
        process.exit(1);
      }
    }
    
    try {
      await testEndpoint(endpoint, method, data);
    } catch (error) {
      process.exit(1);
    }
  } else {
    // Interactive mode
    await interactiveMode();
  }
}

// Run the main function
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
}).finally(() => {
  process.exit(0);
}); 