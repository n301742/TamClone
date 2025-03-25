import path from 'path';
import dotenv from 'dotenv';
import { BriefButlerService } from '../services/brief-butler.service';
import { LetterSubmissionData } from '../types/briefbutler.types';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testBriefButlerService() {
  console.log('🧪 Testing BriefButler Service...');
  
  // Create a new instance of the BriefButlerService
  console.log('📦 Creating BriefButlerService instance...');
  const briefButlerService = new BriefButlerService();
  
  // Set test mode to true
  console.log('🔧 Setting BRIEFBUTLER_TEST_MODE=true');
  process.env.BRIEFBUTLER_TEST_MODE = 'true';
  
  // Create a test file path (we're using a .txt file for testing)
  const pdfPath = path.resolve(__dirname, '../../test-files/test-letter.txt');
  console.log(`📄 Using test file at: ${pdfPath}`);
  
  // Check if the file exists
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ Test file not found at ${pdfPath}`);
    return;
  }
  console.log('✅ Test file found');
  
  // Create a test letter submission
  console.log('📝 Creating test letter submission data...');
  const testLetterData: LetterSubmissionData = {
    pdfPath,
    profileId: 'test-profile-123',
    recipientName: 'John Doe',
    recipientAddress: '123 Test Street',
    recipientCity: 'Vienna',
    recipientZip: '1010',
    recipientCountry: 'Austria',
    recipientState: 'Vienna',
    isExpress: false,
    isRegistered: true,
    isColorPrint: false,
    isDuplexPrint: true,
  };
  
  try {
    // Submit the test letter
    console.log('📬 Submitting test letter...');
    const result = await briefButlerService.submitLetter(testLetterData);
    console.log('✅ Submit Result:', JSON.stringify(result, null, 2));
    
    // If the letter was submitted successfully, try to get its status
    if (result.success && result.data?.trackingId) {
      console.log(`\n🔍 Getting status for letter with tracking ID: ${result.data.trackingId}`);
      const statusResult = await briefButlerService.getLetterStatus(result.data.trackingId);
      console.log('✅ Status Result:', JSON.stringify(statusResult, null, 2));
      
      // Test cancellation
      console.log(`\n❌ Cancelling letter with tracking ID: ${result.data.trackingId}`);
      const cancelResult = await briefButlerService.cancelLetter(result.data.trackingId);
      console.log('✅ Cancel Result:', JSON.stringify(cancelResult, null, 2));
    } else {
      console.log('❌ No tracking ID found in the response, skipping status check');
    }
    
    // Test getting user profiles
    console.log('\n👤 Getting user profiles for test user...');
    const profilesResult = await briefButlerService.getUserProfiles('test-user-123');
    console.log('✅ Profiles Result:', JSON.stringify(profilesResult, null, 2));
  } catch (error: any) {
    console.error('❌ Error testing BriefButlerService:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
console.log('🚀 Starting BriefButlerService test...');
testBriefButlerService()
  .then(() => {
    console.log('🎉 Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  }); 