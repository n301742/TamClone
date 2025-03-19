/**
 * API Routes Test Script
 * 
 * This script tests just our API routes without actually calling the BriefButler service.
 * It mocks the BriefButlerService to return dummy successful responses.
 * 
 * Run with: npx ts-node src/scripts/test-api-only.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import * as path from 'path';
import { briefButlerService } from '../services/brief-butler.service';
import { PrismaClient } from '@prisma/client';

// Create a new Prisma client directly rather than importing from app
const prisma = new PrismaClient();

// Load environment variables
dotenv.config();

// Set environment variable for testing
process.env.BRIEFBUTLER_TEST_MODE = 'true';

// API base URL
const API_BASE_URL = 'http://localhost:3000/api/brief-butler';

// Test profile ID
const TEST_PROFILE_ID = 'test-profile-123'; 
// Test user ID
const TEST_USER_ID = 'e05f0ff2-04fb-44e8-acf9-e9fca79b7c33';

// Mock the BriefButlerService
// We'll replace the real methods with mock implementations
const originalSubmitLetter = briefButlerService.submitLetter;
const originalGetLetterStatus = briefButlerService.getLetterStatus;
const originalCancelLetter = briefButlerService.cancelLetter;
const originalGetUserProfiles = briefButlerService.getUserProfiles;

function mockBriefButlerService() {
  // Enable mock mode in the service
  briefButlerService.enableMockMode();
  console.log('✅ BriefButlerService mock mode enabled');
}

function restoreBriefButlerService() {
  // Disable mock mode in the service
  briefButlerService.disableMockMode();
  console.log('✅ BriefButlerService mock mode disabled');
}

// Function to check if server is running
async function isServerRunning(): Promise<boolean> {
  try {
    await axios.get('http://localhost:3000/');
    console.log('✅ Server is already running on port 3000');
    return true;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 3000. Please start the server first.');
      return false;
    }
    // Other errors might mean the server is running but returning an error
    console.log('⚠️ Server might be running but returned an error');
    return true;
  }
}

async function testApiOnly() {
  try {
    console.log('🧪 Starting API-only test...');
    
    // Check if server is running
    const serverRunning = await isServerRunning();
    if (!serverRunning) {
      console.log('Please start the server with: npm run dev');
      return;
    }
    
    // Mock the BriefButlerService to return dummy responses
    mockBriefButlerService();
    
    // Step 1: Test GET /profiles/:userId
    console.log('\n1️⃣ Testing GET /profiles/:userId...');
    try {
      const profilesResponse = await axios.get(`${API_BASE_URL}/profiles/${TEST_USER_ID}`);
      console.log('✅ Status:', profilesResponse.status);
      console.log('✅ Response:', profilesResponse.data);
    } catch (error: any) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    // Step 2: Find a letter to test with
    console.log('\n2️⃣ Finding a letter to test with...');
    const letter = await prisma.letter.findFirst({
      where: {
        trackingId: null,
        pdfPath: { not: null },
        recipientName: { not: null },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (!letter) {
      console.log('❌ No suitable letter found for testing. Please upload a letter first.');
      return;
    }
    
    console.log(`✅ Found letter: ${letter.id}`);
    
    // Step 3: Test POST /submit
    console.log('\n3️⃣ Testing POST /submit...');
    let trackingId: string | null = null;
    
    try {
      const submitResponse = await axios.post(`${API_BASE_URL}/submit`, {
        letterId: letter.id,
        profileId: TEST_PROFILE_ID,
      });
      
      console.log('✅ Status:', submitResponse.status);
      console.log('✅ Response:', submitResponse.data);
      
      trackingId = submitResponse.data.data?.trackingId;
      
      if (trackingId) {
        console.log(`✅ Tracking ID: ${trackingId}`);
      } else {
        console.log('❌ No tracking ID received, cannot test status or cancellation.');
      }
    } catch (error: any) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    if (trackingId) {
      // Step 4: Test GET /status/:trackingId
      console.log('\n4️⃣ Testing GET /status/:trackingId...');
      try {
        const statusResponse = await axios.get(`${API_BASE_URL}/status/${trackingId}`);
        console.log('✅ Status:', statusResponse.status);
        console.log('✅ Response:', statusResponse.data);
      } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
      }
      
      // Step 5: Test POST /cancel/:trackingId
      console.log('\n5️⃣ Testing POST /cancel/:trackingId...');
      try {
        const cancelResponse = await axios.post(`${API_BASE_URL}/cancel/${trackingId}`);
        console.log('✅ Status:', cancelResponse.status);
        console.log('✅ Response:', cancelResponse.data);
      } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
      }
    }
    
    console.log('\n🎉 API-only test completed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Restore the original BriefButlerService methods
    restoreBriefButlerService();
    
    // Disconnect from the database
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
    
    // Add a small delay before exiting to ensure any pending HTTP requests complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run the test
testApiOnly().then(() => {
  console.log('Test script execution completed.');
}); 