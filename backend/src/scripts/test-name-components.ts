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
 * Tests the BriefButler API with various recipient name combinations
 * to demonstrate the first name and last name approach
 */
async function testNameComponents() {
  console.log('==== TESTING BRIEFBUTLER NAME COMPONENTS ====');
  
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
  
  // Define different name test cases
  const testCases = [
    {
      name: "Simple name",
      recipientName: "Max Mustermann",
      recipientFirstName: "Max",
      recipientLastName: "Mustermann"
    },
    {
      name: "Multi-part last name",
      recipientName: "Anna Maria Schmidt-Meyer",
      recipientFirstName: "Anna Maria",
      recipientLastName: "Schmidt-Meyer"
    },
    {
      name: "Academic title",
      recipientName: "Dr. Johann Weber",
      recipientFirstName: "Johann",
      recipientLastName: "Weber"
    },
    {
      name: "Only first name",
      recipientName: "Johannes",
      recipientFirstName: "Johannes",
      recipientLastName: ""
    },
    {
      name: "Only last name",
      recipientName: "Schneider",
      recipientFirstName: "",
      recipientLastName: "Schneider"
    }
  ];
  
  // Process each test case
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`\n\n==== Test Case ${i+1}: ${testCase.name} ====`);
    console.log(`Full name: "${testCase.recipientName}"`);
    console.log(`First name: "${testCase.recipientFirstName}"`);
    console.log(`Last name: "${testCase.recipientLastName}"`);
    
    // Create a unique reference ID for this test
    const referenceId = `test-name-${Date.now()}-${i}`;
    
    // Prepare the submission data with the test case name values
    const submissionData: SpoolSubmissionData = {
      pdfPath: pdfPath,
      recipientName: testCase.recipientName,
      recipientFirstName: testCase.recipientFirstName,
      recipientLastName: testCase.recipientLastName,
      recipientAddress: "Teststraße 123",
      recipientCity: "Berlin",
      recipientZip: "10115",
      recipientCountry: "DE",
      recipientState: "Berlin",
      recipientEmail: "test@example.com",
      recipientPhone: "+491234567890",
      senderName: "Test Sender GmbH",
      senderAddress: "Senderweg 50",
      senderCity: "Vienna",
      senderZip: "1010",
      senderCountry: "AT",
      senderState: "Vienna",
      reference: referenceId,
      isColorPrint: false,
      isDuplexPrint: true,
      isExpress: false,
      isRegistered: true,
      deliveryProfile: "briefbutler-test",
      priority: "NORMAL"
    };
    
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
          
          console.log('\nStatus:');
          const state = statusResult.data?.state;
          if (state) {
            console.log(`State: ${state.stateName} (${state.stateCode})`);
            console.log(`Channel: ${state.channel || 'N/A'}`);
            console.log(`Last updated: ${new Date(state.updated).toLocaleString()}`);
          } else {
            console.log(JSON.stringify(statusResult, null, 2));
          }
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
    
    // Add a small delay between test cases
    if (i < testCases.length - 1) {
      console.log('\nWaiting before next test case...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n==== ALL TESTS COMPLETED ====');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testNameComponents()
    .catch(error => {
      logger.error(`Test failed with error: ${error.message}`);
      process.exit(1);
    });
} 