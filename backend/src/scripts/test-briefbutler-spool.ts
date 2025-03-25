/**
 * Test script for the BriefButler spool service integration
 * Run with: npx ts-node src/scripts/test-briefbutler-spool.ts
 */

import { BriefButlerService } from '../services/brief-butler.service';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSpoolService() {
  console.log('Testing BriefButler spool service integration...');
  
  // Test file path - use a sample PDF from test files
  const testPdfPath = path.resolve(process.cwd(), 'test-files/sample-letter.pdf');
  
  // Check if test file exists
  if (!fs.existsSync(testPdfPath)) {
    console.error(`Test file not found at ${testPdfPath}`);
    console.log('Please provide a valid test PDF file at test-files/sample-letter.pdf');
    return;
  }
  
  // Enable mock mode to avoid actual API calls during testing
  const briefButlerService = new BriefButlerService();
  briefButlerService.enableMockMode();
  
  // Test data for spool submission
  const testSpoolData = {
    pdfPath: testPdfPath,
    recipientName: 'Max Mustermann',
    recipientAddress: 'Musterstraße 123',
    recipientCity: 'Berlin',
    recipientZip: '10115',
    recipientCountry: 'Germany',
    recipientState: 'Berlin',
    senderName: 'Erika Mustermann',
    senderAddress: 'Senderstraße 456',
    senderCity: 'Munich',
    senderZip: '80331',
    senderCountry: 'Germany',
    senderState: 'Bavaria',
    reference: 'Test Reference 123',
    isColorPrint: false,
    isDuplexPrint: true,
    priority: 'normal'
  };
  
  try {
    // Test submitting a document to the spool service
    console.log('Testing submitSpool method...');
    const submitResult = await briefButlerService.submitSpool(testSpoolData);
    
    console.log('\nSubmit Spool Result:');
    console.log(JSON.stringify(submitResult, null, 2));
    
    if (submitResult.success) {
      const spoolId = submitResult.data.spool_id;
      
      // Test getting the status of a spool submission
      console.log('\nTesting getSpoolStatus method with ID:', spoolId);
      const statusResult = await briefButlerService.getSpoolStatus(spoolId);
      
      console.log('\nSpool Status Result:');
      console.log(JSON.stringify(statusResult, null, 2));
    }
    
    console.log('\nTest completed successfully!');
  } catch (error: any) {
    console.error('Error during test:', error.message);
  } finally {
    // Disable mock mode after testing
    briefButlerService.disableMockMode();
  }
}

// Run the test
testSpoolService().catch(console.error); 