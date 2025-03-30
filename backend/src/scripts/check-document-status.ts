import { BriefButlerService } from '../services/brief-butler.service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkDocumentStatus() {
  // Get tracking ID from command line arguments
  const args = process.argv.slice(2);
  const trackingId = args[0];
  
  if (!trackingId) {
    console.error('❌ Error: Please provide a tracking ID as an argument');
    console.error('Usage: npx ts-node backend/src/scripts/check-document-status.ts <trackingId>');
    process.exit(1);
  }
  
  console.log(`Checking status for tracking ID: ${trackingId}`);
  
  // Initialize the BriefButler service
  const briefButlerService = new BriefButlerService();
  
  // Check for mock mode flag
  const useMockMode = args.includes('--mock');
  if (useMockMode) {
    console.log('Running in MOCK mode');
    briefButlerService.enableMockMode();
  }
  
  try {
    // Get the status
    const result = await briefButlerService.getTrackingStatus(trackingId);
    
    if (result.success) {
      console.log('\n✅ Status retrieved successfully:');
      
      // Extract relevant information
      const data = result.data;
      
      console.log(`\nTracking ID: ${data.trackingId}`);
      console.log(`Delivery ID: ${data.deliveryId || 'N/A'}`);
      
      if (data.state) {
        console.log(`\nCurrent Status: ${data.state.stateName} (Code: ${data.state.stateCode})`);
        console.log(`Timestamp: ${new Date(data.state.timestamp).toLocaleString()}`);
        console.log(`Last Updated: ${new Date(data.state.updated).toLocaleString()}`);
        
        if (data.state.channel) {
          console.log(`Channel: ${data.state.channel}`);
        }
      }
      
      // Print history in reverse chronological order
      if (data.history && data.history.length > 0) {
        console.log('\nStatus History:');
        const history = [...data.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        history.forEach((entry, index) => {
          console.log(`\n${index + 1}. ${entry.stateName} (Code: ${entry.stateCode})`);
          console.log(`   Time: ${new Date(entry.timestamp).toLocaleString()}`);
          if (entry.channel) {
            console.log(`   Channel: ${entry.channel}`);
          }
        });
      }
      
      // Check for receipt or document attachments
      if (data.state.returnReceiptDocuments && data.state.returnReceiptDocuments.length > 0) {
        console.log('\nAvailable Receipts:');
        data.state.returnReceiptDocuments.forEach((doc: any, index: number) => {
          console.log(`${index + 1}. ${doc.name} (ID: ${doc.documentId})`);
        });
      }
      
      if (data.state.outgoingDocuments && data.state.outgoingDocuments.length > 0) {
        console.log('\nAvailable Documents:');
        data.state.outgoingDocuments.forEach((doc: any, index: number) => {
          console.log(`${index + 1}. ${doc.name} (ID: ${doc.documentId})`);
          if (doc.availableUntil) {
            console.log(`   Available until: ${new Date(doc.availableUntil).toLocaleString()}`);
          }
        });
      }
      
      // Print full JSON data if verbose mode
      if (args.includes('--verbose')) {
        console.log('\nFull Response Data:');
        console.log(JSON.stringify(result.data, null, 2));
      }
    } else {
      console.error('\n❌ Failed to retrieve status:');
      console.error(result.message);
      if (result.error) {
        console.error('Error details:', result.error);
      }
    }
  } catch (error: any) {
    console.error('\n❌ Error during status check:');
    console.error(error.message);
    
    if (error.response) {
      console.error('\nResponse data:');
      console.error(JSON.stringify(error.response.data, null, 2));
      console.error('\nResponse status:', error.response.status);
    }
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  checkDocumentStatus()
    .catch(error => {
      console.error(`Script failed with error: ${error.message}`);
      process.exit(1);
    });
} 