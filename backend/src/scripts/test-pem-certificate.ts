/**
 * PEM Certificate Authentication Test Script
 * 
 * This script tests the certificate authentication using PEM files by:
 * 1. Loading the certificate and private key PEM files
 * 2. Making a direct HTTPS request to the BriefButler API
 * 3. Reporting success or failure
 * 
 * Run with: npx ts-node src/scripts/test-pem-certificate.ts
 */

import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// API base URL
const API_BASE_URL = 'https://demodelivery.briefbutler.com';
const PRIVATE_KEY_PASSPHRASE = process.env.BRIEFBUTLER_CERTIFICATE_PASSWORD || 'foobar';

async function testWithPemCertificate() {
  try {
    console.log('🔍 Starting certificate test...');
    console.log(`📡 Testing API at: ${API_BASE_URL}`);
    
    // Check that PEM files exist
    const certPath = path.resolve(__dirname, '../../certs_temp/certificate.pem');
    const keyPath = path.resolve(__dirname, '../../certs_temp/private_key.pem');
    
    console.log(`📄 Looking for certificate at: ${certPath}`);
    console.log(`🔑 Looking for private key at: ${keyPath}`);
    
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.error('❌ PEM files not found. Please extract them first.');
      return;
    }
    
    console.log('✅ Found both certificate and private key files');
    
    // Read certificate and key files
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    console.log('✅ Successfully read certificate and key files');

    // Create HTTPS agent with the certificate and key
    console.log('🔒 Creating HTTPS agent with certificate...');
    const httpsAgent = new https.Agent({
      cert,
      key,
      passphrase: PRIVATE_KEY_PASSPHRASE,
      rejectUnauthorized: false // Disable SSL verification for testing
    });

    // Create axios instance with the HTTPS agent
    console.log('🌐 Creating API client...');
    const apiClient = axios.create({
      baseURL: API_BASE_URL,
      httpsAgent,
      timeout: 10000 // 10 seconds timeout
    });

    // Test endpoints
    const endpoints = [
      { method: 'get', url: '/', name: 'Root Endpoint' },
      { method: 'get', url: '/letter', name: 'Letter Endpoint' },
      { method: 'get', url: '/status/test-tracking', name: 'Letter Status' },
      { method: 'get', url: '/profiles/test-user', name: 'User Profiles' }
    ];

    console.log(`\n🧪 Testing ${endpoints.length} endpoints...`);
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n📡 Testing ${endpoint.name} endpoint (${endpoint.method.toUpperCase()} ${endpoint.url})...`);
        
        const startTime = Date.now();
        let response;
        
        if (endpoint.method === 'get') {
          response = await apiClient.get(endpoint.url);
        } else if (endpoint.method === 'post') {
          response = await apiClient.post(endpoint.url, {});
        }
        
        const duration = Date.now() - startTime;
        console.log(`⏱️  Response time: ${duration}ms`);
        console.log(`📥 Response status: ${response?.status}`);
        console.log(`📦 Response data:`, response?.data);
      } catch (error: any) {
        console.error(`❌ Error testing ${endpoint.name}:`, error.message);
        if (error.response) {
          console.log(`📥 Response status: ${error.response.status}`);
          console.log(`📦 Response data:`, error.response.data);
        } else if (error.code) {
          console.error(`🔧 Error code: ${error.code}`);
        }
        if (error.cause) {
          console.error('🔍 Error cause:', error.cause);
        }
      }
    }
  } catch (error: any) {
    console.error('💥 Test failed:', error.message);
    if (error.stack) {
      console.error('📚 Stack trace:', error.stack);
    }
  }
}

// Run the test
console.log('🚀 Starting certificate test script...');
testWithPemCertificate()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }); 