/**
 * BriefButler HTTP API Test Script
 * 
 * This script tests the BriefButler HTTP endpoints by:
 * 1. Getting user profiles
 * 2. Finding a letter to test with
 * 3. Submitting the letter to BriefButler
 * 4. Checking the letter status
 * 5. Canceling the letter
 * 
 * Run with: npx ts-node src/scripts/test-briefbutler-http.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { prisma } from '../app';

// Load environment variables
dotenv.config();

// API base URL
const API_BASE_URL = 'http://localhost:3000/api/brief-butler';

// Test profile ID - replace with actual profile ID from BriefButler
const TEST_PROFILE_ID = 'profile-123'; 
// Test user ID - replace with an actual user ID from your database
const TEST_USER_ID = 'e05f0ff2-04fb-44e8-acf9-e9fca79b7c33';

// Function to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testBriefButlerHttpApi() {
  try {
    console.log('🧪 Starting BriefButler HTTP API test...');
    
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
      // Step 4: Wait a bit then test GET /status/:trackingId
      console.log('\n4️⃣ Waiting 5 seconds before checking letter status...');
      await sleep(5000);
      
      console.log(`Testing GET /status/${trackingId}...`);
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
    
    console.log('\n🎉 BriefButler HTTP API test completed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Disconnect from the database
    await prisma.$disconnect();
  }
}

// Run the test
testBriefButlerHttpApi().then(() => {
  console.log('Test script execution completed.');
}); 