import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { BriefButlerService } from '../services/brief-butler.service';
import { SpoolSubmissionData } from '../types/briefbutler.types';
import { createTestPdf } from './create-test-pdf';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Tests the BriefButler API with a name that includes an academic title
 * to demonstrate how first name and last name are separated
 */
async function testAcademicTitleName() {
  console.log('==== TESTING BRIEFBUTLER NAME WITH ACADEMIC TITLE ====');
  
  // Check for mock mode flag
  const args = process.argv.slice(2);
  const useMockMode = args.includes('--mock');
  
  if (useMockMode) {
    console.log('Running in MOCK mode - no actual API calls will be made');
  } else {
    console.log('⚠️ Running in REAL mode - this will make actual API calls to BriefButler');
    console.log('Press Ctrl+C within 5 seconds to abort...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Create a test PDF file if it doesn't exist
  let pdfPath = path.join(process.cwd(), 'test-data', 'sample-letter.pdf');
  if (!fs.existsSync(pdfPath)) {
    pdfPath = await createTestPdf();
  }
  
  // Initialize the BriefButler service
  const briefButlerService = new BriefButlerService();
  
  // Enable mock mode if specified
  if (useMockMode) {
    briefButlerService.enableMockMode();
    console.log('Mock mode enabled');
  }
  
  // Define test case with academic title
  const testCase = {
    name: "Academic title",
    recipientName: "Dr. Johann Weber",
    recipientFirstName: "Johann",
    recipientLastName: "Weber"
  };
  
  console.log(`\nTest Case: ${testCase.name}`);
  console.log(`Full name: "${testCase.recipientName}"`);
  console.log(`First name: "${testCase.recipientFirstName}"`);
  console.log(`Last name: "${testCase.recipientLastName}"`);
  
  // Create a unique reference ID for this test
  const referenceId = `test-academic-name-${Date.now()}`;
  
  // Prepare the submission data with the test case name values
  const submissionData: SpoolSubmissionData = {
    pdfPath: pdfPath,
    recipientName: testCase.recipientName,
    recipientFirstName: testCase.recipientFirstName,
    recipientLastName: testCase.recipientLastName,
    recipientAddress: "Universitätsstraße 10",
    recipientCity: "Vienna",
    recipientZip: "1090",
    recipientCountry: "AT",
    recipientState: "Vienna",
    recipientEmail: "dr.weber@university.edu",
    recipientPhone: "+43123456789",
    senderName: "Academic Press Publishing",
    senderAddress: "Verlagsweg 5",
    senderCity: "Vienna",
    senderZip: "1010",
    senderCountry: "AT",
    senderState: "Vienna",
    reference: referenceId,
    isColorPrint: true,
    isDuplexPrint: true,
    isExpress: false,
    isRegistered: true,
    deliveryProfile: "briefbutler-test",
    priority: "NORMAL"
  };
  
  console.log('\nSubmission data:');
  console.log(JSON.stringify(submissionData, null, 2));
  
  console.log('\nSubmitting document to BriefButler...');
  
  try {
    // Submit the document to BriefButler
    const result = await briefButlerService.submitDualDelivery(submissionData);
    
    console.log('\nSubmission result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Submission successful!');
      console.log(`Tracking ID: ${result.data?.trackingId}`);
      
      // Check the status (only if we have a tracking ID)
      if (result.data?.trackingId) {
        console.log('\nFetching status...');
        
        // Wait a moment before checking status
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResult = await briefButlerService.getTrackingStatus(result.data.trackingId);
        
        console.log('\nStatus result:');
        console.log(JSON.stringify(statusResult.data, null, 2));
      }
    } else {
      console.log('\n❌ Submission failed!');
    }
  } catch (error: any) {
    console.error('\n❌ Error during submission:');
    console.error(error.message);
    
    if (error.response) {
      console.error('\nResponse data:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n==== TEST COMPLETED ====');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testAcademicTitleName()
    .catch(error => {
      logger.error(`Test failed with error: ${error.message}`);
      process.exit(1);
    });
} 