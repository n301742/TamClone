import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { BriefButlerService } from '../services/brief-butler.service';
import { SpoolSubmissionData } from '../types/briefbutler.types';
import { createTestPdf } from './create-test-pdf';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Tests a real document submission to the BriefButler API
 */
async function testRealSubmission() {
  // Banner for the test
  console.log('==== TESTING REAL BRIEFBUTLER DOCUMENT SUBMISSION ====');
  
  // Check for mock mode flag
  const args = process.argv.slice(2);
  const useMockMode = args.includes('--mock');
  
  if (useMockMode) {
    console.log('Running in MOCK mode - no actual API calls will be made');
  } else {
    console.log('⚠️ Running in REAL mode - this will make actual API calls to BriefButler');
    console.log('Press Ctrl+C within 5 seconds to abort...');
    
    // Give the user a chance to abort
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log('Starting test...');
  
  // Create a test PDF file if it doesn't exist
  let pdfPath = path.join(process.cwd(), 'test-data', 'sample-letter.pdf');
  if (!fs.existsSync(pdfPath)) {
    pdfPath = await createTestPdf();
  }
  
  // Check if the path exists now
  if (!fs.existsSync(pdfPath)) {
    console.log('Failed to create test PDF file');
    process.exit(1);
  }
  
  console.log(`Using PDF file at: ${pdfPath}`);
  
  // Create a unique reference ID for this test
  const referenceId = `test-letter-${Date.now()}`;
  
  // Prepare the submission data
  const submissionData: SpoolSubmissionData = {
    pdfPath: pdfPath,
    recipientName: 'Max Mustermann',
    recipientAddress: 'Teststraße 123',
    recipientCity: 'Berlin',
    recipientZip: '10115',
    recipientCountry: 'DE',
    recipientState: 'Berlin', // Optional state
    recipientEmail: 'test@example.com', // Optional email
    recipientPhone: '+491234567890', // Optional phone
    senderName: 'Test Sender GmbH',
    senderAddress: 'Senderweg 50',
    senderCity: 'Vienna',
    senderZip: '1010',
    senderCountry: 'AT',
    senderState: 'Vienna',
    reference: referenceId,
    isColorPrint: false,
    isDuplexPrint: true, // Double-sided printing
    isExpress: false,
    isRegistered: true, // Use registered mail
    deliveryProfile: 'briefbutler-test', // Use test profile
    priority: 'NORMAL'
  };
  
  console.log('\nSubmission data:');
  console.log(JSON.stringify(submissionData, null, 2));
  
  // Initialize the BriefButler service
  const briefButlerService = new BriefButlerService();
  
  // Enable mock mode if specified
  if (useMockMode) {
    briefButlerService.enableMockMode();
    console.log('Mock mode enabled');
  }
  
  console.log('\nSubmitting document to BriefButler...');
  
  try {
    // Submit the document for dual delivery
    const submissionResult = await briefButlerService.submitDualDelivery(submissionData);
    
    console.log('\nSubmission result:');
    console.log(JSON.stringify(submissionResult, null, 2));
    
    if (submissionResult.success) {
      console.log('\n✅ Submission successful!');
      
      // Extract tracking ID
      const trackingId = submissionResult.data?.trackingId;
      
      if (trackingId) {
        console.log(`\nTracking ID: ${trackingId}`);
        console.log('\nFetching status...');
        
        // Wait a moment before checking status
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check the status of the submission
        const statusResult = await briefButlerService.getTrackingStatus(trackingId);
        
        console.log('\nStatus result:');
        console.log(JSON.stringify(statusResult, null, 2));
      } else {
        console.log('\n⚠️ No tracking ID returned, cannot check status');
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
      console.error('\nResponse status:', error.response.status);
      console.error('\nResponse headers:');
      console.error(JSON.stringify(error.response.headers, null, 2));
    }
  }
  
  console.log('\n==== TEST COMPLETED ====');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRealSubmission()
    .catch(error => {
      logger.error(`Test failed with error: ${error.message}`);
      process.exit(1);
    });
} 