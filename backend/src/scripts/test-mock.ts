/**
 * Simplified Mock Test Script
 * 
 * This script directly calls the BriefButler service methods in mock mode
 * 
 * Run with: npx ts-node src/scripts/test-mock.ts
 */

import dotenv from 'dotenv';
import { briefButlerService } from '../services/brief-butler.service';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Create a Prisma client
const prisma = new PrismaClient();

// Test profile ID
const TEST_PROFILE_ID = 'test-profile-123'; 
// Test user ID
const TEST_USER_ID = 'e05f0ff2-04fb-44e8-acf9-e9fca79b7c33';

async function testMockMode() {
  try {
    console.log('🧪 Starting direct mock mode test...');
    
    // Enable mock mode
    briefButlerService.enableMockMode();
    console.log('✅ Mock mode enabled');
    
    // Step 1: Test getUserProfiles
    console.log('\n1️⃣ Testing getUserProfiles...');
    const profilesResult = await briefButlerService.getUserProfiles(TEST_USER_ID);
    console.log('Result:', profilesResult);
    
    // Step 2: Find a letter to test with
    console.log('\n2️⃣ Finding a letter to test with...');
    const letter = await prisma.letter.findFirst({
      where: {
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
    
    // Step 3: Test submitLetter
    console.log('\n3️⃣ Testing submitLetter...');
    const letterPath = path.resolve(process.cwd(), letter.pdfPath || 'uploads/test.pdf');
    
    // Create a test PDF if it doesn't exist
    if (!fs.existsSync(letterPath)) {
      console.log(`Creating dummy PDF at ${letterPath}`);
      const dummyPdfDir = path.dirname(letterPath);
      if (!fs.existsSync(dummyPdfDir)) {
        fs.mkdirSync(dummyPdfDir, { recursive: true });
      }
      fs.writeFileSync(letterPath, 'Dummy PDF content');
    }
    
    const submitResult = await briefButlerService.submitLetter({
      pdfPath: letterPath,
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
    
    console.log('Result:', submitResult);
    
    if (submitResult.success) {
      const trackingId = submitResult.data?.trackingId || 'mock-tracking-123';
      
      // Step 4: Test getLetterStatus
      console.log('\n4️⃣ Testing getLetterStatus...');
      const statusResult = await briefButlerService.getLetterStatus(trackingId);
      console.log('Result:', statusResult);
      
      // Step 5: Test cancelLetter
      console.log('\n5️⃣ Testing cancelLetter...');
      const cancelResult = await briefButlerService.cancelLetter(trackingId);
      console.log('Result:', cancelResult);
    }
    
    console.log('\n🎉 Direct mock mode test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Disable mock mode
    briefButlerService.disableMockMode();
    console.log('✅ Mock mode disabled');
    
    // Disconnect from the database
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the test
testMockMode().then(() => {
  console.log('Test script execution completed.');
}); 