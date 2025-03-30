/**
 * Test script for BriefButler dual delivery implementation
 * 
 * This script tests the submitDualDelivery method by:
 * 1. Creating a sample PDF file
 * 2. Preparing sample data
 * 3. Calling the service method directly
 * 4. Displaying the response
 * 
 * Run with: npx ts-node backend/src/scripts/test-briefbutler-dual-delivery.ts [--mock]
 * Add --mock flag to run in mock mode (doesn't require a valid certificate)
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { BriefButlerService } from '../services/brief-butler.service';
import { SpoolSubmissionData } from '../types/briefbutler.types';

// Load environment variables
dotenv.config();

// Parse command line arguments
const useMockMode = process.argv.includes('--mock');

async function testDualDelivery() {
  console.log('==== TESTING BRIEFBUTLER DUAL DELIVERY ====');
  console.log(`Running in ${useMockMode ? 'MOCK' : 'LIVE'} mode`);
  console.log('Starting test...');
  
  // Create a BriefButler service instance
  const briefButlerService = new BriefButlerService();
  
  // Enable mock mode if requested
  if (useMockMode) {
    briefButlerService.enableMockMode();
    console.log('Mock mode enabled - no real API calls will be made');
  }
  
  // Path to a sample PDF file for testing
  // First look for an existing test PDF
  const testPdfPaths = [
    path.resolve(process.cwd(), 'backend/test-data/sample.pdf'),
    path.resolve(process.cwd(), 'test-data/sample.pdf'),
    path.resolve(process.cwd(), 'test/sample.pdf'),
    path.resolve(process.cwd(), 'backend/test/sample.pdf')
  ];
  
  let pdfPath = '';
  for (const testPath of testPdfPaths) {
    if (fs.existsSync(testPath)) {
      pdfPath = testPath;
      console.log(`Using existing PDF file at: ${pdfPath}`);
      break;
    }
  }
  
  // If no PDF found, create a simple one using a temporary text file
  if (!pdfPath) {
    console.log('No sample PDF found. Creating a temporary text file instead...');
    const tempPath = path.resolve(process.cwd(), 'backend/test-data/temp-sample.txt');
    
    // Create the directory if it doesn't exist
    const dir = path.dirname(tempPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write some sample text
    fs.writeFileSync(tempPath, 'This is a sample document for BriefButler testing.');
    pdfPath = tempPath;
    console.log(`Created temporary file at: ${pdfPath}`);
  }
  
  // Create test data
  const submissionData: SpoolSubmissionData = {
    pdfPath: pdfPath,
    recipientName: 'Max Mustermann',
    recipientAddress: 'Teststraße 123',
    recipientCity: 'Berlin',
    recipientZip: '10115',
    recipientCountry: 'DE',
    recipientEmail: 'test@example.com',
    senderName: 'Test Company GmbH',
    senderAddress: 'Senderweg 1',
    senderCity: 'Wien',
    senderZip: '1010',
    senderCountry: 'AT',
    reference: `test-${Date.now()}`,
    isColorPrint: false,
    isDuplexPrint: true,
    isExpress: false,
    isRegistered: true,
    deliveryProfile: 'briefbutler-test'
  };
  
  console.log('\nSubmission data:');
  console.log(JSON.stringify(submissionData, null, 2));
  
  try {
    console.log('\nSubmitting document to BriefButler...');
    const result = await briefButlerService.submitDualDelivery(submissionData);
    
    console.log('\nSubmission result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Test successful!');
      
      // If we got a tracking ID, check its status
      if (result.data?.trackingId) {
        const trackingId = result.data.trackingId;
        console.log(`\nChecking status for tracking ID: ${trackingId}`);
        
        try {
          const statusResult = await briefButlerService.getTrackingStatus(trackingId);
          console.log('\nStatus result:');
          console.log(JSON.stringify(statusResult, null, 2));
        } catch (statusError: any) {
          console.error(`Error checking status: ${statusError.message}`);
        }
      }
    } else {
      console.log('\n❌ Test failed!');
    }
  } catch (error: any) {
    console.error('\n❌ Error occurred during test:');
    console.error(error.message);
    
    if (error.response) {
      console.error('\nResponse data:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n==== TEST COMPLETED ====');
}

// Run the test function
testDualDelivery().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 