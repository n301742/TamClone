#!/usr/bin/env ts-node
/**
 * Test script for BriefButler connection
 * Creates a sample PDF and tries to submit it to the BriefButler API
 */

import { BriefButlerService } from '../services/brief-butler.service';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// Disable mock mode for testing
process.env.BRIEFBUTLER_TEST_MODE = 'false';

/**
 * Create a sample PDF in memory
 */
function createSamplePdf(): string {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const pdfPath = path.join(tempDir, 'test-document.pdf');
  
  // Create a simple PDF content
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 6 0 R >> >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (Test Document) Tj ET
endstream
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000216 00000 n
0000000260 00000 n
0000000354 00000 n
trailer
<< /Size 7 /Root 1 0 R >>
startxref
423
%%EOF`;

  fs.writeFileSync(pdfPath, pdfContent);
  console.log(`Created sample PDF at ${pdfPath}`);
  
  return pdfPath;
}

/**
 * Main function to test BriefButler connection
 */
async function testBriefButlerConnection() {
  try {
    console.log('Testing BriefButler API connection...');
    
    // Create a sample PDF
    const pdfPath = createSamplePdf();
    
    // Initialize the BriefButler service
    const briefButlerService = new BriefButlerService();
    
    // Check if we're in mock mode
    if (briefButlerService['inMockMode']) {
      console.error('ERROR: Still in mock mode despite setting environment variable');
      console.log('This could be due to certificate issues - check logs');
      return;
    }
    
    // Print cert info
    const certPath = process.env.BRIEFBUTLER_CERTIFICATE_PATH || 'Not set';
    console.log(`Using certificate at: ${certPath}`);
    
    // Log environment variables (redacting sensitive data)
    console.log(`API URL: ${process.env.BRIEFBUTLER_API_URL}`);
    console.log(`API Key: ${process.env.BRIEFBUTLER_API_KEY ? '****' : 'Not set'}`);
    
    // Try to submit a document
    const result = await briefButlerService.submitSpool({
      pdfPath,
      recipientName: 'Test Recipient',
      recipientAddress: 'Test Street 123',
      recipientCity: 'Vienna', 
      recipientZip: '1030',
      recipientCountry: 'AT',
      recipientState: '',
      recipientEmail: 'test@example.com',
      recipientPhone: '+4312345678',
      senderName: 'Test Sender',
      senderAddress: 'Sender Street 456',
      senderCity: 'Vienna',
      senderZip: '1010',
      senderCountry: 'AT',
      senderState: '',
      reference: 'TEST-CONNECTION-REF',
      isColorPrint: true,
      isDuplexPrint: true,
      priority: 'NORMAL'
    });
    
    // Log the result
    console.log('BriefButler API Response:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('SUCCESS: Connection to BriefButler API established!');
    } else {
      console.log('ERROR: Failed to connect to BriefButler API');
    }
  } catch (error: any) {
    console.error('Error testing BriefButler connection:');
    console.error(error);
  }
}

// Run the test
testBriefButlerConnection()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Uncaught error:', err)); 