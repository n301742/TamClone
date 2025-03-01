# Troubleshooting Guide

This document provides solutions for common issues encountered with the PDF Processing Service.

## Common Issues and Solutions

### Address Extraction Failures

#### Issue: No Address Extracted

**Symptoms:**
- The service returns an empty address object
- Logs show "No text found in address window"

**Possible Causes:**
1. PDF document doesn't contain text (scanned image without OCR)
2. Address is not positioned in the standard window
3. PDF is password protected or encrypted

**Solutions:**
1. **Check if PDF contains text:**
   ```typescript
   // Check if PDF has extractable text
   const pdfExtract = new PDFExtract();
   const data = await pdfExtract.extractBuffer(pdfBuffer);
   if (data.pages[0].content.length === 0) {
     logger.warn('PDF does not contain extractable text - may need OCR processing');
   }
   ```

2. **Try different address window positions:**
   ```typescript
   // Try all standard address window positions
   for (const formType of Object.values(AddressFormType)) {
     const address = await pdfService.extractAddressFromPdf(filePath, formType);
     if (address.name || address.street || address.city) {
       logger.info(`Address found using form type: ${formType}`);
       return address;
     }
   }
   ```

3. **Check if PDF is encrypted:**
   ```typescript
   // Check for encryption
   const isPdfEncrypted = await pdfService.isPdfEncrypted(filePath);
   if (isPdfEncrypted) {
     throw new Error('PDF is encrypted and cannot be processed');
   }
   ```

#### Issue: Incomplete Address Extraction

**Symptoms:**
- Only some address components are extracted
- Missing street, city, or postal code

**Possible Causes:**
1. Address format doesn't match expected pattern
2. Text is split across multiple lines unexpectedly
3. Special characters or fonts causing parsing issues

**Solutions:**
1. **Adjust line grouping threshold:**
   ```typescript
   // Adjust the threshold for grouping text by lines
   const windowLines = this.groupTextByLines(windowItems, {
     lineHeightThreshold: 2 // Increase for more aggressive grouping
   });
   ```

2. **Log the raw extracted text for debugging:**
   ```typescript
   logger.debug('Raw extracted text:', windowText);
   ```

3. **Try more flexible parsing patterns:**
   ```typescript
   // More flexible postal code and city pattern
   const postalCodeCityPattern = /([0-9]{4,5})\s*([A-Za-zÄÖÜäöüß\s\-]+)/;
   ```

### ZIP Code Validation Issues

#### Issue: Valid ZIP Code Not Recognized

**Symptoms:**
- ZIP code validation fails for valid codes
- Logs show "ZIP code not found in database"

**Possible Causes:**
1. ZIP code database is outdated
2. ZIP code is new or recently changed
3. Special case ZIP code (e.g., for large organizations)

**Solutions:**
1. **Check external API directly:**
   ```typescript
   // Test the ZIP code with the external API directly
   const apiUrl = `https://openplzapi.org/de/zipcode/${postalCode}`;
   const response = await axios.get(apiUrl);
   console.log('API response:', response.data);
   ```

2. **Add the ZIP code to the internal database:**
   ```typescript
   // Manually add the ZIP code to the database
   await prisma.zipCode.create({
     data: {
       postalCode: '12345',
       city: 'Berlin',
       country: 'DE',
       allCities: ['Berlin']
     }
   });
   ```

3. **Bypass validation for special cases:**
   ```typescript
   // Special case handling for organizational ZIP codes
   const specialZipCodes = ['01067', '80995']; // Dresden, Munich (examples)
   if (specialZipCodes.includes(postalCode)) {
     logger.info(`Special case ZIP code detected: ${postalCode}`);
     return { matchFound: true, originalCity: city };
   }
   ```

#### Issue: City Name Mismatch

**Symptoms:**
- ZIP code is valid but city name is reported as mismatched
- Logs show "City mismatch: Expected X, found Y"

**Possible Causes:**
1. City name has alternative spellings or variations
2. City is a district or part of a larger municipality
3. City name contains special characters or umlauts

**Solutions:**
1. **Improve city name normalization:**
   ```typescript
   function normalizeCity(city: string): string {
     return city
       .toLowerCase()
       .trim()
       .replace(/[^\w\s]/g, '')
       .replace(/\s+/g, ' ')
       .replace(/ä/g, 'ae')
       .replace(/ö/g, 'oe')
       .replace(/ü/g, 'ue')
       .replace(/ß/g, 'ss');
   }
   ```

2. **Add common city name variations:**
   ```typescript
   const cityVariations: Record<string, string[]> = {
     'muenchen': ['münchen', 'munich'],
     'koeln': ['köln', 'cologne'],
     'frankfurt am main': ['frankfurt', 'frankfurt/main'],
     // Add more variations as needed
   };
   ```

3. **Check against all possible cities for the ZIP code:**
   ```typescript
   if (validationResult.allPossibleCities?.some(possibleCity => 
       normalizeCity(possibleCity) === normalizeCity(address.city))) {
     logger.info(`City ${address.city} is valid for ZIP code ${address.postalCode}`);
     return true;
   }
   ```

#### Issue: Austrian ZIP Code 6971 with City "Hard"

**Symptoms:**
- Address with ZIP code "6971" and city "Hard" gets a confidence score of 0.6
- Logs show "ZIP code and city mismatch detected. Original: 'Hard', Suggested: 'Fußach'"
- Logs show "Keeping Austrian address valid despite validation failure"

**Cause:**
The ZIP code 6971 in Austria serves both the cities "Hard" and "Fußach". If our database only has one of these cities listed for this ZIP code, validation may initially fail for the other city.

**Solution:**
Our system now automatically handles this situation with a dynamic approach:

1. **Dynamic External API Validation:**
   The system now always queries the external API when a city doesn't match the database entry, even if the ZIP code is already in our database. This allows it to discover new valid city combinations:

   ```typescript
   // Always query the external API, even if we have the ZIP code in our database
   // This allows us to discover new valid city combinations
   console.log(`[External ZIP Validation] Checking external API for ZIP code ${zipCode} with city ${city}`);
   
   // Query the appropriate API endpoint
   const url = `${this.API_BASE_URL}/at/Localities?postalCode=${zipCode}`;
   const response = await axios.get<OpenPLZPlace[]>(url);
   
   // Process the results and add new cities to the database
   if (response.data && response.data.length > 0) {
     const apiCities = response.data.map(place => place.name).filter(Boolean);
     console.log(`[External ZIP Validation] API returned cities for ${zipCode}: ${apiCities.join(', ')}`);
     
     // If this is a new city for this ZIP code, add it to our database
     if (apiCities.includes(city) && !internalCities.includes(city)) {
       await this.cacheZipCodeResult(zipCode, city, state, countryCode, 'address-extraction');
     }
   }
   ```

2. **Automatic Database Updates:**
   When the system discovers a new valid city for a ZIP code, it automatically adds it to the database:

   ```typescript
   // If this is a new city for this ZIP code, add it to our database
   if (!internalCities.includes(matchedCity)) {
     console.log(`[External ZIP Validation] Adding new city ${matchedCity} for ZIP code ${zipCode} to database`);
     await this.cacheZipCodeResult(
       zipCode, 
       matchedCity, 
       state || null, 
       countryCode,
       'address-extraction'
     );
   }
   ```

3. **No Manual Intervention Required:**
   The first time the system encounters "6971 Hard", it might validate with a lower confidence score. However, it will add "Hard" to the database as a valid city for ZIP code 6971. All subsequent validations of "6971 Hard" will succeed with high confidence.

4. **Monitoring:**
   You can monitor the logs to see when new city-ZIP code combinations are discovered and added to the database:

   ```
   [External ZIP Validation] Checking external API for ZIP code 6971 with city Hard
   [External ZIP Validation] API returned cities for 6971: Fußach, Hard
   [External ZIP Validation] Adding new city Hard for ZIP code 6971 to database
   ```

This dynamic approach eliminates the need for manual database updates or hard-coded special cases, making the system more maintainable and adaptable.

### Performance Issues

#### Issue: Slow Processing Times

**Symptoms:**
- PDF processing takes more than 5 seconds
- High CPU usage during processing

**Possible Causes:**
1. Large or complex PDF documents
2. Inefficient text extraction
3. Multiple external API calls

**Solutions:**
1. **Limit processing to first page only:**
   ```typescript
   // Only process the first page for address extraction
   const firstPageContent = data.pages[0].content;
   ```

2. **Implement caching for external API calls:**
   ```typescript
   // Check cache before making API call
   const cacheKey = `zipcode_${postalCode}_${country}`;
   const cachedResult = await cacheService.get(cacheKey);
   if (cachedResult) {
     return JSON.parse(cachedResult);
   }
   
   // Make API call and cache result
   const result = await makeApiCall();
   await cacheService.set(cacheKey, JSON.stringify(result), 86400); // Cache for 24 hours
   ```

3. **Optimize text extraction with targeted area:**
   ```typescript
   // Only extract text from the address window area
   const windowItems = this.extractTextFromArea(
     contentItems,
     addressWindow.top,
     addressWindow.left,
     addressWindow.width,
     addressWindow.height
   );
   ```

#### Issue: Memory Usage Spikes

**Symptoms:**
- High memory usage during PDF processing
- Occasional out-of-memory errors

**Possible Causes:**
1. Processing large PDF files
2. Memory leaks in PDF extraction
3. Inefficient handling of large text content

**Solutions:**
1. **Implement file size limits:**
   ```typescript
   const MAX_PDF_SIZE_MB = 10;
   
   // Check file size before processing
   const stats = fs.statSync(filePath);
   const fileSizeMB = stats.size / (1024 * 1024);
   if (fileSizeMB > MAX_PDF_SIZE_MB) {
     throw new Error(`PDF file too large: ${fileSizeMB.toFixed(2)}MB (max: ${MAX_PDF_SIZE_MB}MB)`);
   }
   ```

2. **Stream PDF processing for large files:**
   ```typescript
   // Use streams for large files
   const pdfStream = fs.createReadStream(filePath);
   // Process the stream in chunks
   ```

3. **Clean up resources after processing:**
   ```typescript
   // Ensure proper cleanup after processing
   try {
     const result = await processFile(filePath);
     return result;
   } finally {
     // Clean up temporary files
     if (fs.existsSync(tempFilePath)) {
       fs.unlinkSync(tempFilePath);
     }
   }
   ```

### Integration Issues

#### Issue: API Response Format Errors

**Symptoms:**
- Error: "Cannot read property 'X' of undefined"
- Unexpected API response structure

**Possible Causes:**
1. API contract changes
2. Different response format for edge cases
3. API errors not properly handled

**Solutions:**
1. **Add robust response validation:**
   ```typescript
   // Validate API response structure
   function validateApiResponse(response: any): boolean {
     if (!response || typeof response !== 'object') return false;
     if (!Array.isArray(response.cities)) return false;
     return true;
   }
   
   // Use validation before processing
   const apiResponse = await axios.get(apiUrl);
   if (!validateApiResponse(apiResponse.data)) {
     logger.error('Invalid API response format', { response: apiResponse.data });
     throw new Error('Invalid API response format');
   }
   ```

2. **Implement fallback handling:**
   ```typescript
   try {
     const result = await externalService.validateZipCode(postalCode, city);
     return result;
   } catch (error) {
     logger.warn(`External validation failed: ${error.message}`);
     // Fall back to internal validation only
     return internalService.validateZipCode(postalCode, city);
   }
   ```

3. **Add timeout handling:**
   ```typescript
   // Add timeout to API calls
   const response = await axios.get(apiUrl, { timeout: 5000 });
   ```

#### Issue: Database Connection Problems

**Symptoms:**
- Error: "Cannot connect to database"
- Timeout errors when accessing the database

**Possible Causes:**
1. Database server is down
2. Connection pool exhaustion
3. Network issues

**Solutions:**
1. **Implement connection retry logic:**
   ```typescript
   async function connectWithRetry(maxRetries = 5, delay = 1000): Promise<void> {
     let retries = 0;
     while (retries < maxRetries) {
       try {
         await prisma.$connect();
         logger.info('Database connection established');
         return;
       } catch (error) {
         retries++;
         logger.warn(`Database connection attempt ${retries} failed: ${error.message}`);
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }
     throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
   }
   ```

2. **Implement connection pooling:**
   ```typescript
   // Configure connection pool
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
     // Configure connection pool
     log: ['query', 'info', 'warn', 'error'],
   });
   ```

3. **Add health check endpoint:**
   ```typescript
   app.get('/health/db', async (req, res) => {
     try {
       // Simple query to check database connection
       await prisma.$queryRaw`SELECT 1`;
       res.status(200).json({ status: 'ok' });
     } catch (error) {
       logger.error('Database health check failed', { error });
       res.status(500).json({ status: 'error', message: error.message });
     }
   });
   ```

## Debugging Techniques

### Logging

Enable detailed logging for troubleshooting:

```typescript
// Configure logger with detailed level for troubleshooting
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'pdf-processing-debug.log' })
  ]
});

// Add context to logs
logger.debug('Processing PDF', {
  filePath,
  formType,
  fileSize: fs.statSync(filePath).size
});
```

### Visual Debugging

For address window positioning issues:

```typescript
// Generate a debug PDF with address window highlighted
async function generateDebugPdf(
  originalPdfPath: string,
  addressWindow: AddressWindow,
  outputPath: string
): Promise<void> {
  // Load the original PDF
  const pdfDoc = await PDFDocument.load(fs.readFileSync(originalPdfPath));
  const page = pdfDoc.getPages()[0];
  
  // Draw a rectangle around the address window
  page.drawRectangle({
    x: mmToPoints(addressWindow.left),
    y: page.getHeight() - mmToPoints(addressWindow.top + addressWindow.height),
    width: mmToPoints(addressWindow.width),
    height: mmToPoints(addressWindow.height),
    borderColor: rgb(1, 0, 0),
    borderWidth: 1,
    opacity: 0.3
  });
  
  // Save the debug PDF
  fs.writeFileSync(outputPath, await pdfDoc.save());
}
```

### Step-by-Step Processing

Break down the processing steps for detailed debugging:

```typescript
async function debugAddressExtraction(filePath: string): Promise<void> {
  // Step 1: Load PDF
  logger.debug('Step 1: Loading PDF');
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfExtract = new PDFExtract();
  const data = await pdfExtract.extractBuffer(pdfBuffer);
  logger.debug(`PDF loaded with ${data.pages.length} pages`);
  
  // Step 2: Extract text from first page
  logger.debug('Step 2: Extracting text from first page');
  const firstPageContent = data.pages[0].content;
  logger.debug(`First page has ${firstPageContent.length} content items`);
  
  // Step 3: Identify address window
  logger.debug('Step 3: Identifying address window');
  const addressWindow = getAddressWindow(AddressFormType.FORM_A);
  logger.debug('Address window:', addressWindow);
  
  // Step 4: Extract text from address window
  logger.debug('Step 4: Extracting text from address window');
  const windowItems = extractTextFromArea(
    firstPageContent,
    mmToPoints(addressWindow.top),
    mmToPoints(addressWindow.left),
    mmToPoints(addressWindow.width),
    mmToPoints(addressWindow.height)
  );
  logger.debug(`Found ${windowItems.length} items in address window`);
  
  // Step 5: Group text by lines
  logger.debug('Step 5: Grouping text by lines');
  const windowLines = groupTextByLines(windowItems);
  logger.debug(`Grouped into ${windowLines.length} lines`);
  
  // Step 6: Format text
  logger.debug('Step 6: Formatting text');
  const windowText = formatTextWithImprovedSpacing(windowLines);
  logger.debug('Formatted text:', windowText);
  
  // Step 7: Parse address
  logger.debug('Step 7: Parsing address');
  const addressData = parseAddressFromText(windowText);
  logger.debug('Parsed address:', addressData);
}
```

## Monitoring and Alerts

Set up monitoring to detect issues proactively:

```typescript
// Track processing times
const startTime = Date.now();
const result = await processFile(filePath);
const processingTime = Date.now() - startTime;

// Log processing time
logger.info(`PDF processed in ${processingTime}ms`, {
  processingTime,
  fileSize: fs.statSync(filePath).size,
  success: !!result
});

// Alert on slow processing
if (processingTime > 5000) {
  logger.warn(`Slow PDF processing detected: ${processingTime}ms`, {
    filePath,
    processingTime
  });
}
```

## Common Error Codes and Meanings

| Error Code | Description | Possible Solution |
|------------|-------------|-------------------|
| `PDF_NOT_FOUND` | PDF file not found or inaccessible | Check file path and permissions |
| `PDF_ENCRYPTED` | PDF is password protected | Remove password protection before uploading |
| `PDF_NO_TEXT` | PDF contains no extractable text | Use OCR processing before uploading |
| `ADDRESS_NOT_FOUND` | No address detected in standard window | Check document formatting or try different form type |
| `ZIP_VALIDATION_FAILED` | ZIP code validation failed | Check if ZIP code exists and is correctly formatted |
| `API_TIMEOUT` | External API request timed out | Check API status or increase timeout |
| `DB_CONNECTION_ERROR` | Database connection failed | Check database status and connection settings |

## Contact Support

If you encounter issues that cannot be resolved using this guide, please contact support with the following information:

1. Error message and code
2. PDF file (if possible)
3. Processing logs
4. Steps to reproduce the issue
5. Expected vs. actual results

Support email: support@briefbutler.com 