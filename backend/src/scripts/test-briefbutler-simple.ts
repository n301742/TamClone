import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { BriefButlerService } from '../services/brief-butler.service';
import { SpoolSubmissionData } from '../types/briefbutler.types';
import { createTestPdf } from './create-test-pdf';

// Load environment variables
dotenv.config();

/**
 * Simple test for BriefButler API without database dependencies
 */
async function testBriefButlerSimple() {
  console.log('==== SIMPLE BRIEFBUTLER API TEST ====');
  
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
  
  console.log('Starting test...');
  
  // Create test PDF
  let pdfPath = path.join(process.cwd(), 'test-data', 'sample-letter.pdf');
  if (!fs.existsSync(pdfPath)) {
    pdfPath = await createTestPdf();
  }
  
  console.log(`Using PDF file at: ${pdfPath}`);
  
  // Create a unique reference ID for this test
  const referenceId = `test-letter-${Date.now()}`;
  
  // Prepare the submission data
  const submissionData: SpoolSubmissionData = {
    pdfPath: pdfPath,
    recipientName: 'Max Mustermann',
    recipientFirstName: 'Max',
    recipientLastName: 'Mustermann',
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
    // Submit the document
    const result = await briefButlerService.submitDualDelivery(submissionData);
    
    console.log('\nSubmission result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Submission successful!');
      
      // Extract tracking ID
      const trackingId = result.data?.trackingId;
      
      if (trackingId) {
        console.log(`\nTracking ID: ${trackingId}`);
        console.log('\nFetching status...');
        
        // Wait a moment before checking status
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check the status
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
  testBriefButlerSimple()
    .catch(error => {
      console.error(`Test failed with error: ${error.message}`);
      process.exit(1);
    });
} 