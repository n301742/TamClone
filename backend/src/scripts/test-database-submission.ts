import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { createTestPdf } from './create-test-pdf';
import { prisma } from '../app';
import { BriefButlerService } from '../services/brief-butler.service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Tests the BriefButler API by creating a letter in the database first
 */
async function testDatabaseSubmission() {
  console.log('==== TESTING BRIEFBUTLER THROUGH DATABASE SUBMISSION ====');
  
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
  
  // Relative path for database storage
  const relativePdfPath = path.relative(process.cwd(), pdfPath);
  console.log(`Using PDF file at: ${pdfPath} (relative: ${relativePdfPath})`);
  
  // Create a test user if doesn't exist
  let testUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' }
  });
  
  if (!testUser) {
    console.log('Creating test user...');
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER'
      }
    });
  }
  
  console.log(`Using test user with ID: ${testUser.id}`);
  
  // Create a letter in the database
  console.log('Creating letter in database...');
  const letter = await prisma.letter.create({
    data: {
      userId: testUser.id,
      status: 'PROCESSING',
      pdfPath: relativePdfPath,
      fileName: 'sample-letter.pdf',
      fileSize: fs.statSync(pdfPath).size,
      
      recipientName: 'Max Mustermann',
      recipientAddress: 'Teststraße 123',
      recipientCity: 'Berlin',
      recipientState: 'Berlin',
      recipientZip: '10115',
      recipientCountry: 'DE',
      
      description: `Test Letter ${Date.now()}`,
      isExpress: false,
      isRegistered: true,
      isColorPrint: false,
      isDuplexPrint: true
    }
  });
  
  console.log(`Letter created with ID: ${letter.id}`);
  
  // Create sender data for the API call
  const senderData = {
    name: 'Test Sender GmbH',
    address: 'Senderweg 50',
    city: 'Vienna',
    zip: '1010',
    state: 'Vienna',
    country: 'AT',
    reference: `letter-ref-${Date.now()}`,
    deliveryProfile: 'briefbutler-test',
    priority: 'NORMAL'
  };
  
  // Initialize BriefButler service
  const briefButlerService = new BriefButlerService();
  if (useMockMode) {
    briefButlerService.enableMockMode();
    console.log('Mock mode enabled');
  }
  
  // Prepare the controller request
  console.log('Submitting letter to BriefButler...');
  try {
    // First, we'll simulate what the controller would do
    // Create absolute path to PDF file
    if (!letter.pdfPath) {
      throw new Error('PDF path is missing in the letter record');
    }
    
    const absolutePdfPath = path.resolve(process.cwd(), letter.pdfPath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePdfPath)) {
      throw new Error(`PDF file not found at ${absolutePdfPath}`);
    }
    
    // Prepare the submission data
    const submissionData = {
      pdfPath: absolutePdfPath,
      recipientName: letter.recipientName || 'Unknown Recipient',
      recipientAddress: letter.recipientAddress || 'Unknown Address',
      recipientCity: letter.recipientCity || 'Unknown City',
      recipientZip: letter.recipientZip || '00000',
      recipientCountry: letter.recipientCountry || 'DE',
      recipientState: letter.recipientState || undefined,
      recipientEmail: undefined,
      recipientPhone: undefined,
      senderName: senderData.name,
      senderAddress: senderData.address,
      senderCity: senderData.city,
      senderZip: senderData.zip,
      senderCountry: senderData.country,
      senderState: senderData.state || undefined,
      reference: senderData.reference || `letter-${letter.id}`,
      isColorPrint: letter.isColorPrint || false,
      isDuplexPrint: letter.isDuplexPrint !== false, // Default to true
      deliveryProfile: senderData.deliveryProfile || 'briefbutler-test',
      priority: senderData.priority || 'NORMAL'
    };
    
    // Submit the document
    const result = await briefButlerService.submitDualDelivery(submissionData);
    
    console.log('\nSubmission result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Submission successful!');
      
      // Extract tracking ID
      const trackingId = result.data?.trackingId || '';
      
      if (trackingId) {
        // Update letter in database
        await prisma.letter.update({
          where: { id: letter.id },
          data: {
            trackingId,
            deliveryId: submissionData.reference,
            status: 'PROCESSING',
            sentAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        // Add status history entry
        await prisma.statusHistory.create({
          data: {
            letterId: letter.id,
            status: 'PROCESSING',
            message: 'Document submitted to BriefButler dual delivery',
            timestamp: new Date()
          }
        });
        
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
      
      // Record the failure in the database
      await prisma.statusHistory.create({
        data: {
          letterId: letter.id,
          status: 'FAILED',
          message: `Failed to submit to BriefButler: ${result.message}`,
          timestamp: new Date()
        }
      });
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
    
    // Record the error in the database
    await prisma.statusHistory.create({
      data: {
        letterId: letter.id,
        status: 'FAILED',
        message: `Error: ${error.message}`,
        timestamp: new Date()
      }
    });
  }
  
  console.log('\n==== TEST COMPLETED ====');
  
  // Display instructions for cleanup
  console.log('\nTest data was created in the database:');
  console.log(`- Letter ID: ${letter.id}`);
  console.log('\nTo cleanup test data, run:');
  console.log(`npx prisma db execute "DELETE FROM Letter WHERE id = '${letter.id}'"`);
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDatabaseSubmission()
    .catch(error => {
      logger.error(`Test failed with error: ${error.message}`);
      process.exit(1);
    })
    .finally(async () => {
      // Disconnect from the database
      await prisma.$disconnect();
    });
} 