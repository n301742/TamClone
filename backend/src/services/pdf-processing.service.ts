import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { PDFExtract } from 'pdf.js-extract';

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Function to write logs to a file
function writeLog(message: string) {
  const logFile = path.join(logsDir, 'pdf-processing.log');
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  
  // Write to console as well
  console.log(message);
  
  // Append to log file
  fs.appendFileSync(logFile, logMessage);
}

// DIN 676 Type A standard dimensions (in mm, converted to points for PDF processing)
// 1 mm = 2.83465 points
const DIN_676_TYPE_A = {
  // Address window position (from top-left corner of the page)
  addressWindow: {
    // Position from left edge
    left: 20 * 2.83465, // 20mm from left
    // Position from top edge
    top: 40 * 2.83465, // 40mm from top
    // Width of the address window
    width: 90 * 2.83465, // 90mm wide
    // Height of the address window
    height: 45 * 2.83465, // 45mm high
  },
  // A4 page dimensions
  page: {
    width: 210 * 2.83465, // 210mm wide
    height: 297 * 2.83465, // 297mm high
  }
};

/**
 * Interface for extracted address data
 */
export interface ExtractedAddress {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  rawText: string;
  confidence: number;
}

/**
 * Service for processing PDF files and extracting address information
 */
export class PdfProcessingService {
  /**
   * Extract address from a PDF file using OCR
   * @param filePath Path to the PDF file
   * @returns Promise with extracted address data
   */
  public async extractAddressFromPdf(filePath: string): Promise<ExtractedAddress> {
    try {
      writeLog(`[PDF Processing] Starting address extraction for: ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        writeLog(`[PDF Processing] File not found: ${filePath}`);
        throw new Error('PDF file not found');
      }

      writeLog('[PDF Processing] File exists, attempting direct text extraction');
      
      // First try to extract text directly from PDF
      const extractedText = await this.extractTextFromPdf(filePath);
      
      // If we got text, try to parse it
      if (extractedText && extractedText.trim().length > 0) {
        writeLog(`[PDF Processing] Text extracted directly from PDF: ${extractedText.substring(0, 200)}...`);
        
        const parsedAddress = this.parseAddressFromText(extractedText);
        writeLog(`[PDF Processing] Parsed address from text: ${JSON.stringify(parsedAddress)}`);
        
        if (this.isValidAddress(parsedAddress)) {
          writeLog('[PDF Processing] Valid address found via direct extraction');
          return {
            ...parsedAddress,
            rawText: extractedText,
            confidence: 0.8 // Direct extraction usually has good confidence
          };
        } else {
          writeLog('[PDF Processing] Invalid address from direct extraction, falling back to OCR');
        }
      } else {
        writeLog('[PDF Processing] No text extracted directly from PDF, falling back to OCR');
      }

      // If direct extraction failed or didn't yield valid results, try OCR
      return await this.performOcrOnAddressWindow(filePath);
    } catch (error) {
      writeLog(`[PDF Processing] Error extracting address from PDF: ${error}`);
      throw new Error(`Failed to extract address: ${(error as Error).message}`);
    }
  }

  /**
   * Extract text directly from PDF
   * @param filePath Path to the PDF file
   * @returns Promise with extracted text
   */
  private async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      writeLog('[PDF Processing] Reading PDF file for text extraction');
      
      // Read the PDF file
      const dataBuffer = fs.readFileSync(filePath);
      
      writeLog('[PDF Processing] PDF file read, parsing content');
      
      // Parse the PDF
      const data = await pdfParse(dataBuffer);
      
      writeLog(`[PDF Processing] PDF parsed, text length: ${data.text.length}`);
      
      // Return the text content
      return data.text;
    } catch (error) {
      writeLog(`[PDF Processing] Error extracting text from PDF: ${error}`);
      return ''; // Return empty string on error
    }
  }

  /**
   * Perform OCR on the address window area of the first page
   * @param filePath Path to the PDF file
   * @returns Promise with extracted address data
   */
  private async performOcrOnAddressWindow(filePath: string): Promise<ExtractedAddress> {
    try {
      writeLog('[PDF Processing] Starting OCR fallback process');
      
      // Extract the first page as an image
      const pdfExtract = new PDFExtract();
      const options = {}; // Default options
      
      writeLog('[PDF Processing] Extracting PDF structure');
      
      const data = await pdfExtract.extract(filePath, options);
      if (!data.pages || data.pages.length === 0) {
        writeLog('[PDF Processing] No pages found in PDF');
        throw new Error('No pages found in PDF');
      }
      
      writeLog(`[PDF Processing] PDF structure extracted, pages found: ${data.pages.length}`);
      
      // Get the first page
      const firstPage = data.pages[0];
      writeLog(`[PDF Processing] First page dimensions: ${(firstPage as any).width || 'unknown'} x ${(firstPage as any).height || 'unknown'}`);
      
      // Create a temporary directory for processing if it doesn't exist
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        writeLog(`[PDF Processing] Created temp directory: ${tempDir}`);
      }
      
      // Create a temporary image file path
      const tempImagePath = path.join(tempDir, `${path.basename(filePath, '.pdf')}_address.png`);
      writeLog(`[PDF Processing] Temp image path: ${tempImagePath}`);
      
      // FIXME: The PDF to image conversion is not implemented yet
      // For now, we'll try to extract text directly from the PDF again
      // and use that for OCR if possible
      
      writeLog('[PDF Processing] PDF to image conversion not implemented, trying direct extraction again');
      
      // Read the PDF file
      const dataBuffer = fs.readFileSync(filePath);
      
      // Parse the PDF to get text
      const pdfData = await pdfParse(dataBuffer);
      
      writeLog(`[PDF Processing] Second text extraction attempt, text length: ${pdfData.text.length}`);
      
      // If we have text, use that instead of OCR
      if (pdfData.text && pdfData.text.trim().length > 0) {
        writeLog(`[PDF Processing] Text found in second attempt: ${pdfData.text.substring(0, 200)}...`);
        
        const parsedAddress = this.parseAddressFromText(pdfData.text);
        writeLog(`[PDF Processing] Parsed address from second attempt: ${JSON.stringify(parsedAddress)}`);
        
        // Lower the validation requirements for the fallback method
        if (parsedAddress.name || parsedAddress.street || parsedAddress.city) {
          writeLog('[PDF Processing] Partial address found in second attempt, using it with lower confidence');
          return {
            ...parsedAddress,
            rawText: pdfData.text,
            confidence: 0.6 // Lower confidence for fallback method
          };
        }
        
        writeLog('[PDF Processing] No valid address found in second attempt');
      }
      
      // If we couldn't extract text directly, log an error
      writeLog('[PDF Processing] OCR fallback not fully implemented - PDF to image conversion missing');
      
      // Return empty result with low confidence
      return {
        rawText: '',
        confidence: 0
      };
      
      // NOTE: The following code would be used if we had PDF to image conversion
      /*
      // Initialize Tesseract worker
      const worker = await createWorker();
      
      // Set language to English and initialize
      await (worker as any).loadLanguage('eng');
      await (worker as any).initialize('eng');
      
      // Perform OCR on the image
      const { data: { text, confidence } } = await worker.recognize(tempImagePath);
      
      // Terminate the worker
      await worker.terminate();
      
      // Clean up temporary files
      if (fs.existsSync(tempImagePath)) {
        fs.unlinkSync(tempImagePath);
      }
      
      // Parse the extracted text into address components
      const parsedAddress = this.parseAddressFromText(text);
      
      return {
        ...parsedAddress,
        rawText: text,
        confidence: confidence / 100 // Convert to 0-1 scale
      };
      */
    } catch (error) {
      writeLog(`[PDF Processing] Error performing OCR on address window: ${error}`);
      return {
        rawText: '',
        confidence: 0
      };
    }
  }

  /**
   * Parse address components from raw text
   * @param text Raw text from OCR or PDF extraction
   * @returns Parsed address components
   */
  private parseAddressFromText(text: string): Partial<ExtractedAddress> {
    writeLog(`[PDF Processing] Parsing address from text, length: ${text.length}`);
    
    // Split the text into lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    writeLog(`[PDF Processing] Text split into ${lines.length} non-empty lines`);
    
    if (lines.length < 2) {
      writeLog('[PDF Processing] Not enough lines for a valid address');
      return {}; // Not enough lines for a valid address
    }
    
    // For DIN 676 business letters, we need to understand the structure:
    // 1. Sender info is typically at the top left
    // 2. Recipient address is in the address window (top right)
    // 3. Date and reference info follows the addresses
    // 4. The actual letter content comes after that
    
    const result: Partial<ExtractedAddress> = {};
    
    // First, let's identify the different sections of the letter
    
    // Find the date line - this helps separate address sections from letter content
    let dateLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      // Look for date patterns
      if (/\b\d{1,2}\.\s*\w+\s*\d{4}\b/.test(lines[i]) || // DD. Month YYYY
          /\b\w+,\s*\d{1,2}\.\s*\w+/.test(lines[i])) {    // City, DD. Month
        dateLineIndex = i;
        writeLog(`[PDF Processing] Found date line at index ${i}: "${lines[i]}"`);
        break;
      }
    }
    
    // Find the subject line - typically after the date
    let subjectLineIndex = -1;
    if (dateLineIndex !== -1) {
      for (let i = dateLineIndex + 1; i < Math.min(dateLineIndex + 5, lines.length); i++) {
        if (/\b(Betreff|Betrifft|Subject|Re:|AW:|Antwort:)\b/i.test(lines[i])) {
          subjectLineIndex = i;
          writeLog(`[PDF Processing] Found subject line at index ${i}: "${lines[i]}"`);
          break;
        }
      }
    }
    
    // Find the salutation line - typically after the subject
    let salutationLineIndex = -1;
    const startSearchIndex = subjectLineIndex !== -1 ? subjectLineIndex + 1 : (dateLineIndex !== -1 ? dateLineIndex + 1 : 0);
    for (let i = startSearchIndex; i < Math.min(startSearchIndex + 5, lines.length); i++) {
      if (/\b(Sehr geehrte|Liebe|Hallo|Guten Tag|Grüß Gott)\b/i.test(lines[i])) {
        salutationLineIndex = i;
        writeLog(`[PDF Processing] Found salutation line at index ${i}: "${lines[i]}"`);
        break;
      }
    }
    
    // Find the signature area - typically at the end of the letter
    let signatureStartIndex = -1;
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
      if (/\b(Mit freundlichen Grüßen|Viele Grüße|Beste Grüße|Hochachtungsvoll|MfG|Freundliche Grüße)\b/i.test(lines[i])) {
        signatureStartIndex = i;
        writeLog(`[PDF Processing] Found signature start at index ${i}: "${lines[i]}"`);
        break;
      }
    }
    
    // Now, let's identify the recipient address block
    // In DIN 676, the recipient address is typically in the first few lines,
    // before the date line and after any sender information
    
    // First, look for postal codes to help identify address lines
    const postalCodeIndices: number[] = [];
    for (let i = 0; i < (dateLineIndex !== -1 ? dateLineIndex : lines.length); i++) {
      // Look for German (5 digits) or Austrian (4 digits) postal codes
      if (/\b\d{4,5}\b/.test(lines[i])) {
        postalCodeIndices.push(i);
        writeLog(`[PDF Processing] Found postal code at line ${i}: "${lines[i]}"`);
      }
    }
    
    // If we found multiple postal codes before the date line,
    // the first one is likely part of the sender info, and a later one is the recipient
    let recipientPostalCodeIndex = -1;
    
    if (postalCodeIndices.length > 1) {
      // Use the second postal code as it's likely the recipient's
      recipientPostalCodeIndex = postalCodeIndices[1];
      writeLog(`[PDF Processing] Using second postal code for recipient at line ${recipientPostalCodeIndex}`);
    } else if (postalCodeIndices.length === 1) {
      // If there's only one postal code, we need to determine if it's sender or recipient
      // In DIN 676, recipient address is typically 4-6 lines from the top
      const postalCodeIndex = postalCodeIndices[0];
      if (postalCodeIndex >= 3) {
        recipientPostalCodeIndex = postalCodeIndex;
        writeLog(`[PDF Processing] Using postal code at line ${recipientPostalCodeIndex} as recipient`);
      }
    }
    
    // If we found a recipient postal code, extract the address block around it
    if (recipientPostalCodeIndex !== -1) {
      // Postal code and city are typically on the same line
      const postalCityLine = lines[recipientPostalCodeIndex];
      const postalCodeMatch = postalCityLine.match(/\b(\d{4,5})\b/);
      
      if (postalCodeMatch) {
        result.postalCode = postalCodeMatch[1];
        
        // City is typically after the postal code
        const cityPart = postalCityLine.substring(postalCityLine.indexOf(result.postalCode) + result.postalCode.length).trim();
        result.city = cityPart;
        
        writeLog(`[PDF Processing] Extracted postal code: ${result.postalCode} and city: ${result.city}`);
        
        // Infer country from postal code format
        if (result.postalCode.length === 5) {
          result.country = 'Deutschland'; // German postal code format
        } else if (result.postalCode.length === 4) {
          result.country = 'Österreich'; // Austrian postal code format
        }
        
        // Street address is typically the line before postal code
        if (recipientPostalCodeIndex > 0) {
          result.street = lines[recipientPostalCodeIndex - 1];
          writeLog(`[PDF Processing] Extracted street: ${result.street}`);
        }
        
        // Recipient name is typically 1-2 lines before the street
        if (recipientPostalCodeIndex > 1) {
          // Check if the line before the street might be a company name or department
          const potentialNameLine = lines[recipientPostalCodeIndex - 2];
          
          // If it doesn't look like a street address, it's likely the recipient name
          if (!/straße|strasse|gasse|weg|allee|platz|\b\d+\b/i.test(potentialNameLine)) {
            result.name = potentialNameLine;
            writeLog(`[PDF Processing] Extracted name: ${result.name}`);
          }
          
          // If we still don't have a name and there's another line before, check that
          if (!result.name && recipientPostalCodeIndex > 2) {
            const earlierNameLine = lines[recipientPostalCodeIndex - 3];
            if (!/straße|strasse|gasse|weg|allee|platz|\b\d+\b/i.test(earlierNameLine)) {
              result.name = earlierNameLine;
              writeLog(`[PDF Processing] Extracted name from earlier line: ${result.name}`);
            }
          }
        }
      }
    } else {
      // If we couldn't find a clear recipient postal code, try to identify the recipient block
      // by looking at the structure of the letter
      
      // In DIN 676, the recipient address typically starts around line 4-8
      // and consists of 3-4 consecutive lines
      
      // Look for a block of 3-4 consecutive non-empty lines that could be an address
      let bestAddressBlockStart = -1;
      let bestAddressBlockScore = 0;
      
      // We'll search in the first part of the document, before the date line
      const searchEndIndex = dateLineIndex !== -1 ? dateLineIndex : Math.min(15, lines.length);
      
      for (let i = 3; i < searchEndIndex - 2; i++) {
        let blockScore = 0;
        
        // Check if this could be the start of an address block
        // We'll score each potential block based on address-like characteristics
        
        // Check for name-like first line (no numbers, not too long)
        if (i < lines.length && lines[i].length < 40 && !/\d/.test(lines[i])) {
          blockScore += 1;
        }
        
        // Check for street-like second line (contains street indicators or numbers)
        if (i + 1 < lines.length && 
            (lines[i + 1].match(/straße|strasse|gasse|weg|allee|platz/i) || 
             lines[i + 1].match(/\b\d+\b/))) {
          blockScore += 2;
        }
        
        // Check for postal code and city in third line
        if (i + 2 < lines.length && /\b\d{4,5}\b/.test(lines[i + 2])) {
          blockScore += 3;
        }
        
        // If this block looks more like an address than previous candidates, remember it
        if (blockScore > bestAddressBlockScore) {
          bestAddressBlockScore = blockScore;
          bestAddressBlockStart = i;
        }
      }
      
      // If we found a likely address block, extract the components
      if (bestAddressBlockStart !== -1 && bestAddressBlockScore >= 3) {
        writeLog(`[PDF Processing] Found likely address block starting at line ${bestAddressBlockStart}`);
        
        // Extract name from first line
        result.name = lines[bestAddressBlockStart];
        writeLog(`[PDF Processing] Extracted name: ${result.name}`);
        
        // Extract street from second line
        if (bestAddressBlockStart + 1 < lines.length) {
          result.street = lines[bestAddressBlockStart + 1];
          writeLog(`[PDF Processing] Extracted street: ${result.street}`);
        }
        
        // Extract postal code and city from third line
        if (bestAddressBlockStart + 2 < lines.length) {
          const postalCityLine = lines[bestAddressBlockStart + 2];
          const postalCodeMatch = postalCityLine.match(/\b(\d{4,5})\b/);
          
          if (postalCodeMatch) {
            result.postalCode = postalCodeMatch[1];
            
            // City is typically after the postal code
            const cityPart = postalCityLine.substring(postalCityLine.indexOf(result.postalCode) + result.postalCode.length).trim();
            result.city = cityPart;
            
            writeLog(`[PDF Processing] Extracted postal code: ${result.postalCode} and city: ${result.city}`);
            
            // Infer country from postal code format
            if (result.postalCode.length === 5) {
              result.country = 'Deutschland';
            } else if (result.postalCode.length === 4) {
              result.country = 'Österreich';
            }
          } else {
            // If no postal code found, the whole line might be the city
            result.city = postalCityLine;
            writeLog(`[PDF Processing] Extracted city (no postal code): ${result.city}`);
          }
        }
      }
    }
    
    // If we still don't have a recipient name, look for it in the signature area
    // Sometimes the recipient is mentioned near the signature
    if (!result.name && signatureStartIndex !== -1) {
      // Look for potential recipient names after the signature start
      for (let i = signatureStartIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        // Look for lines that might be a name (not too long, no special characters)
        if (line.length > 3 && line.length < 40 && 
            !line.includes('@') && !line.includes('http') && 
            !/\d{4,}/.test(line) && // No long numbers
            !/straße|strasse|gasse|weg|allee|platz/i.test(line)) { // Not a street
          
          // If this line is followed by what looks like an address, it's likely a name
          if (i + 1 < lines.length && 
              (lines[i + 1].match(/straße|strasse|gasse|weg|allee|platz/i) || 
               lines[i + 1].match(/\b\d+\b/))) {
            result.name = line;
            writeLog(`[PDF Processing] Found potential recipient name in signature area: ${result.name}`);
            
            // If we don't have a street yet, use the next line
            if (!result.street) {
              result.street = lines[i + 1];
              writeLog(`[PDF Processing] Extracted street from signature area: ${result.street}`);
              
              // If there's another line that might contain postal code and city, use it
              if (i + 2 < lines.length && /\b\d{4,5}\b/.test(lines[i + 2])) {
                const postalCityLine = lines[i + 2];
                const postalCodeMatch = postalCityLine.match(/\b(\d{4,5})\b/);
                
                if (postalCodeMatch) {
                  result.postalCode = postalCodeMatch[1];
                  
                  // City is typically after the postal code
                  const cityPart = postalCityLine.substring(postalCityLine.indexOf(result.postalCode) + result.postalCode.length).trim();
                  result.city = cityPart;
                  
                  writeLog(`[PDF Processing] Extracted postal code from signature area: ${result.postalCode} and city: ${result.city}`);
                  
                  // Infer country from postal code format
                  if (result.postalCode.length === 5) {
                    result.country = 'Deutschland';
                  } else if (result.postalCode.length === 4) {
                    result.country = 'Österreich';
                  }
                }
              }
            }
            
            break;
          }
        }
      }
    }
    
    // Final validation and cleanup
    
    // If we have a name that contains a street indicator, it might be a street
    if (result.name && (result.name.match(/straße|strasse|gasse|weg|allee|platz/i) || result.name.match(/\b\d+\b/)) && !result.street) {
      result.street = result.name;
      result.name = undefined;
      writeLog(`[PDF Processing] Moved name to street as it appears to be a street address: ${result.street}`);
    }
    
    // If we have a street that looks more like a name, swap them
    if (result.street && !result.street.match(/straße|strasse|gasse|weg|allee|platz/i) && !result.street.match(/\b\d+\b/) && !result.name) {
      result.name = result.street;
      result.street = undefined;
      writeLog(`[PDF Processing] Moved street to name as it appears to be a name: ${result.name}`);
    }
    
    // If we have a city with a postal code, extract it
    if (result.city && result.city.match(/\b\d{4,5}\b/) && !result.postalCode) {
      const postalCodeMatch = result.city.match(/\b(\d{4,5})\b/);
      if (postalCodeMatch) {
        result.postalCode = postalCodeMatch[1];
        result.city = result.city.replace(result.postalCode, '').trim();
        writeLog(`[PDF Processing] Extracted postal code from city: ${result.postalCode}, city: ${result.city}`);
      }
    }
    
    // If we have a name that contains a comma, it might be a "Last name, First name" format
    if (result.name && result.name.includes(',')) {
      const parts = result.name.split(',').map(p => p.trim());
      if (parts.length === 2 && parts[0] && parts[1]) {
        // Rearrange to "First name Last name" format
        result.name = `${parts[1]} ${parts[0]}`;
        writeLog(`[PDF Processing] Rearranged name from "Last, First" to "First Last": ${result.name}`);
      }
    }
    
    // Look specifically for the recipient at the end of the document
    // This is a common pattern in German business letters
    let foundRecipientAtEnd = false;
    
    // Start from the end and look for a complete address block
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
      // Look for a postal code
      if (/\b\d{4,5}\b/.test(lines[i])) {
        // Check if this is part of a complete address (name, street, postal code + city)
        if (i >= 2) {
          // Check if the previous lines look like a street and name
          const potentialStreet = lines[i - 1];
          const potentialName = lines[i - 2];
          
          // If these look like a valid address, use them
          if (potentialStreet && potentialName) {
            const postalCityLine = lines[i];
            const postalCodeMatch = postalCityLine.match(/\b(\d{4,5})\b/);
            
            if (postalCodeMatch) {
              // This looks like a complete address at the end of the document
              result.postalCode = postalCodeMatch[1];
              
              // City is typically after the postal code
              const cityPart = postalCityLine.substring(postalCityLine.indexOf(result.postalCode) + result.postalCode.length).trim();
              result.city = cityPart || postalCityLine; // Use the whole line if we couldn't extract the city
              
              result.street = potentialStreet;
              result.name = potentialName;
              
              // Infer country from postal code format
              if (result.postalCode.length === 5) {
                result.country = 'Deutschland';
              } else if (result.postalCode.length === 4) {
                result.country = 'Österreich';
              }
              
              writeLog(`[PDF Processing] Found complete address block at end of document`);
              writeLog(`[PDF Processing] Name: ${result.name}`);
              writeLog(`[PDF Processing] Street: ${result.street}`);
              writeLog(`[PDF Processing] Postal code: ${result.postalCode}, City: ${result.city}`);
              
              foundRecipientAtEnd = true;
              break;
            }
          }
        }
      }
    }
    
    // If we found a complete address at the end, it's likely the recipient
    // This takes precedence over other extracted information
    if (foundRecipientAtEnd) {
      // We've already updated the result object, so no need to do anything else
      writeLog(`[PDF Processing] Using address block found at end of document as recipient`);
    }
    
    return result;
  }

  /**
   * Check if the parsed address has enough valid components
   * @param address Parsed address components
   * @returns Boolean indicating if address is valid
   */
  private isValidAddress(address: Partial<ExtractedAddress>): boolean {
    // An address is considered valid if it has at least name, street, and city
    const isValid = !!(
      address.name && 
      address.street && 
      address.city
    );
    
    writeLog(`[PDF Processing] Address validation result: ${isValid} for ${JSON.stringify(address)}`);
    
    return isValid;
  }
}

// Export a singleton instance
export const pdfProcessingService = new PdfProcessingService(); 