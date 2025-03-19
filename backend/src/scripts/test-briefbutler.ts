/**
 * BriefButler API Test Script
 * 
 * This script tests the BriefButler integration by:
 * 1. Getting user profiles
 * 2. Getting a letter from the database
 * 3. Submitting the letter to BriefButler
 * 4. Checking the letter status
 * 
 * Run with: npx ts-node src/scripts/test-briefbutler.ts
 */

import { prisma } from '../app';
import { briefButlerService } from '../services/brief-butler.service';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Create a directory for logs if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Test profile ID - replace with actual profile ID from BriefButler
const TEST_PROFILE_ID = 'profile-123';
// Test user ID - replace with an actual user ID from your database
const TEST_USER_ID = 'e05f0ff2-04fb-44e8-acf9-e9fca79b7c33'; 

// Function to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testBriefButlerIntegration() {
  try {
    console.log('🧪 Starting BriefButler API integration test...');
    
    // Step 1: Test getUserProfiles
    console.log('\n1️⃣ Testing getUserProfiles...');
    const profilesResult = await briefButlerService.getUserProfiles(TEST_USER_ID);
    console.log('✅ getUserProfiles result:', 
      profilesResult.success 
      ? 'SUCCESS' 
      : `FAILED: ${profilesResult.message}`
    );
    
    if (profilesResult.success) {
      console.log(`Found ${
        Array.isArray(profilesResult.data) 
        ? profilesResult.data.length 
        : 'unknown number of'
      } profiles`);
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
    console.log(`Letter details:
      - Recipient: ${letter.recipientName}
      - Address: ${letter.recipientAddress}
      - City: ${letter.recipientCity}
      - ZIP: ${letter.recipientZip}
      - Country: ${letter.recipientCountry}
      - PDF Path: ${letter.pdfPath}
    `);
    
    // Check if file exists
    const pdfPath = path.resolve(process.cwd(), letter.pdfPath || '');
    const fileExists = fs.existsSync(pdfPath);
    console.log(`PDF file ${fileExists ? 'exists' : 'DOES NOT EXIST'}: ${pdfPath}`);
    
    if (!fileExists) {
      console.log('❌ PDF file not found, cannot proceed with test.');
      return;
    }
    
    // Step 3: Test submitLetter
    console.log('\n3️⃣ Testing submitLetter...');
    const submitResult = await briefButlerService.submitLetter({
      pdfPath: pdfPath,
      recipientName: letter.recipientName || 'Test Recipient',
      recipientAddress: letter.recipientAddress || 'Test Address',
      recipientCity: letter.recipientCity || 'Test City',
      recipientZip: letter.recipientZip || '12345',
      recipientCountry: letter.recipientCountry || 'Test Country',
      recipientState: letter.recipientState || undefined,
      profileId: TEST_PROFILE_ID,
      isExpress: letter.isExpress,
      isRegistered: letter.isRegistered,
      isColorPrint: letter.isColorPrint,
      isDuplexPrint: letter.isDuplexPrint,
    });
    
    console.log('✅ submitLetter result:', 
      submitResult.success 
      ? 'SUCCESS' 
      : `FAILED: ${submitResult.message}`
    );
    
    if (submitResult.success) {
      console.log('Letter submission details:', submitResult.data);
      
      const trackingId = submitResult.data?.trackingId || submitResult.data?.id;
      
      if (trackingId) {
        console.log(`Tracking ID: ${trackingId}`);
        
        // Update the letter in our database
        await prisma.letter.update({
          where: { id: letter.id },
          data: {
            trackingId,
            status: 'SENT',
            sentAt: new Date(),
            profileId: TEST_PROFILE_ID,
          },
        });
        
        // Step 4: Wait a bit then test getLetterStatus
        console.log('\n4️⃣ Waiting 5 seconds before checking letter status...');
        await sleep(5000);
        
        console.log('Testing getLetterStatus...');
        const statusResult = await briefButlerService.getLetterStatus(trackingId);
        console.log('✅ getLetterStatus result:', 
          statusResult.success 
          ? 'SUCCESS' 
          : `FAILED: ${statusResult.message}`
        );
        
        if (statusResult.success) {
          console.log('Letter status details:', statusResult.data);
        }
        
        // Step 5: Test cancelLetter
        console.log('\n5️⃣ Testing cancelLetter...');
        const cancelResult = await briefButlerService.cancelLetter(trackingId);
        console.log('✅ cancelLetter result:', 
          cancelResult.success 
          ? 'SUCCESS' 
          : `FAILED: ${cancelResult.message}`
        );
        
        if (cancelResult.success) {
          console.log('Letter cancellation details:', cancelResult.data);
          
          // Update the letter in our database
          await prisma.letter.update({
            where: { id: letter.id },
            data: {
              status: 'FAILED',
            },
          });
        }
      } else {
        console.log('❌ No tracking ID received, cannot test status or cancellation.');
      }
    }
    
    console.log('\n🎉 BriefButler API integration test completed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Disconnect from the database
    await prisma.$disconnect();
  }
}

// Run the test
testBriefButlerIntegration().then(() => {
  console.log('Test script execution completed.');
}); 