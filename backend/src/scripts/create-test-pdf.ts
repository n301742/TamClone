import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

/**
 * Creates a simple PDF file for testing the BriefButler API
 */
async function createTestPdf() {
  // Define the path where the PDF will be saved
  const testDataDir = path.join(process.cwd(), 'test-data');
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
    logger.info(`Created test data directory at ${testDataDir}`);
  }
  
  const pdfPath = path.join(testDataDir, 'sample-letter.pdf');
  
  // Simple PDF content
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
<< /Length 144 >>
stream
BT 
/F1 24 Tf
100 700 Td
(Test Letter Document) Tj
/F1 12 Tf
0 -50 Td
(This is a sample letter for testing the BriefButler API integration.) Tj
ET
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
0000000454 00000 n
trailer
<< /Size 7 /Root 1 0 R >>
startxref
523
%%EOF`;

  // Write the PDF file
  fs.writeFileSync(pdfPath, pdfContent);
  logger.info(`Test PDF created at ${pdfPath}`);
  
  return pdfPath;
}

// Run the function if this script is executed directly
if (require.main === module) {
  createTestPdf()
    .then(pdfPath => {
      logger.info(`Successfully created test PDF at: ${pdfPath}`);
    })
    .catch(error => {
      logger.error(`Error creating test PDF: ${error.message}`);
    });
}

export { createTestPdf }; 