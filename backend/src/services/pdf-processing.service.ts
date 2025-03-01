import fs from 'fs';
import path from 'path';
import { PDFExtract } from 'pdf.js-extract';
import { zipValidationService } from './zip-validation.service';
import { externalZipValidationService } from './external-zip-validation.service';
import { streetValidationService } from './street-validation.service';

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

// 1 mm = 2.83465 points (PDF points)
const MM_TO_POINTS = 2.83465;

// Define form types enum
export enum AddressFormType {
  FORM_A = 'formA',
  FORM_B = 'formB',
  DIN_676 = 'din676'
}

// DIN 5008 standard dimensions (in mm, converted to points for PDF processing)
const DIN_5008 = {
  // Address field dimensions and positions
  addressField: {
    // Form A (hochgestelltes Anschriftfeld)
    formA: {
      // Position from top edge
      top: 27 * MM_TO_POINTS, // 27mm from top
      // Height of the address field
      height: 40 * MM_TO_POINTS, // 40mm high
    },
    // Form B (tiefgestelltes Anschriftfeld)
    formB: {
      // Position from top edge
      top: 45 * MM_TO_POINTS, // 45mm from top
      // Height of the address field
      height: 40 * MM_TO_POINTS, // 40mm high
    },
    // Common dimensions for both forms
    // Position from left edge (based on left margin)
    left: 20 * MM_TO_POINTS, // 20mm from left
    // Width of the address field
    width: 85 * MM_TO_POINTS, // 85mm wide
    // Maximum number of lines
    maxLines: 8 // Increased to accommodate more lines
  },
  // A4 page dimensions
  page: {
    width: 210 * MM_TO_POINTS, // 210mm wide
    height: 297 * MM_TO_POINTS, // 297mm high
  }
};

// Keep the old DIN 676 Type A standard for backward compatibility
const DIN_676_TYPE_A = {
  // Address window position (from top-left corner of the page)
  addressWindow: {
    // Position from left edge
    left: 20 * MM_TO_POINTS, // 20mm from left
    // Position from top edge
    top: 40 * MM_TO_POINTS, // 40mm from top
    // Width of the address window
    width: 85 * MM_TO_POINTS, // 85mm wide
    // Height of the address window
    height: 40 * MM_TO_POINTS, // 40mm high
  },
  // A4 page dimensions
  page: {
    width: 210 * MM_TO_POINTS, // 210mm wide
    height: 297 * MM_TO_POINTS, // 297mm high
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
  confidence: number;
  rawText?: string;
  zipValidationDetails?: {
    matchFound: boolean;
    originalCity?: string;
    suggestedCity?: string;
    allPossibleCities?: string[];
    mismatch?: boolean;
  };
  streetValidationDetails?: {
    matchFound: boolean;
    originalStreet?: string;
    suggestedStreet?: string;
    allPossibleStreets?: string[];
    mismatch?: boolean;
  };
}

/**
 * Service for processing PDF files and extracting address information
 */
export class PdfProcessingService {
  /**
   * Extract address from a PDF file using targeted extraction
   * @param filePath Path to the PDF file
   * @param formType Optional parameter to specify which form type to use (default: Form B)
   * @returns Promise with extracted address data
   */
  public async extractAddressFromPdf(
    filePath: string, 
    formType: AddressFormType = AddressFormType.FORM_B
  ): Promise<ExtractedAddress> {
    try {
      writeLog(`[PDF Processing] Starting address extraction for: ${filePath} using form type: ${formType}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        writeLog(`[PDF Processing] File not found: ${filePath}`);
        throw new Error('PDF file not found');
      }

      // Use targeted extraction with the specified form type
      writeLog(`[PDF Processing] Using targeted extraction approach with form type: ${formType}`);
      return await this.performOcrOnAddressWindow(filePath, formType);
      
    } catch (error) {
      writeLog(`[PDF Processing] Error extracting address from PDF: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to extract address: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform OCR on the address window area of a PDF
   * This method focuses specifically on the address window area according to the specified form type
   * @param filePath Path to the PDF file
   * @param formType The form type to use for extraction (default: Form B)
   * @returns Promise with extracted address data
   */
  private async performOcrOnAddressWindow(
    filePath: string, 
    formType: AddressFormType = AddressFormType.FORM_B
  ): Promise<ExtractedAddress> {
    try {
      writeLog(`[PDF Processing] Performing targeted extraction on address window for: ${filePath} using form type: ${formType}`);
      
      // Read the PDF file
      const pdfBuffer = fs.readFileSync(filePath);
      
      // Use pdf.js-extract to get the text content
      const pdfExtract = new PDFExtract();
      const data = await pdfExtract.extractBuffer(pdfBuffer);
      
      if (!data || !data.pages || data.pages.length === 0) {
        writeLog('[PDF Processing] No pages found in PDF');
        throw new Error('No pages found in PDF');
      }
      
      // Get the first page
      const firstPage = data.pages[0];
      // Type assertion for width and height properties
      const pageWidth = (firstPage as any).width || 595; // Default A4 width in points
      const pageHeight = (firstPage as any).height || 842; // Default A4 height in points
      
      writeLog(`[PDF Processing] PDF page dimensions: ${pageWidth}x${pageHeight} points`);
      
      // Define the address window coordinates based on the form type
      let addressWindow;
      let formDescription;
      
      switch (formType) {
        case AddressFormType.FORM_A:
          addressWindow = {
            left: DIN_5008.addressField.left,
            top: DIN_5008.addressField.formA.top,
            width: DIN_5008.addressField.width,
            height: DIN_5008.addressField.formA.height
          };
          formDescription = "DIN 5008 Form A";
          break;
        case AddressFormType.DIN_676:
          addressWindow = {
            left: DIN_676_TYPE_A.addressWindow.left,
            top: DIN_676_TYPE_A.addressWindow.top,
            width: DIN_676_TYPE_A.addressWindow.width,
            height: DIN_676_TYPE_A.addressWindow.height
          };
          formDescription = "DIN 676 Type A";
          break;
        case AddressFormType.FORM_B:
        default:
          addressWindow = {
            left: DIN_5008.addressField.left,
            top: DIN_5008.addressField.formB.top,
            width: DIN_5008.addressField.width,
            height: DIN_5008.addressField.formB.height
          };
          formDescription = "DIN 5008 Form B";
          break;
      }
      
      // Extract text content from the first page
      const contentItems = firstPage.content || [];
      
      // Extract text from the specified address window
      writeLog(`[PDF Processing] Extracting text from ${formDescription} address window`);
      writeLog(`[PDF Processing] Window: left=${addressWindow.left}pt (${addressWindow.left/MM_TO_POINTS}mm), top=${addressWindow.top}pt (${addressWindow.top/MM_TO_POINTS}mm), width=${addressWindow.width}pt (${addressWindow.width/MM_TO_POINTS}mm), height=${addressWindow.height}pt (${addressWindow.height/MM_TO_POINTS}mm)`);
      
      // Filter content items that fall within the address window
      const windowItems = this.extractTextFromArea(
        contentItems,
        addressWindow.top,
        addressWindow.left,
        addressWindow.width,
        addressWindow.height
      );
      
      // Group items by lines and sort them
      const windowLines = this.groupTextByLines(windowItems);
      
      // Convert lines to text with improved spacing
      const windowText = this.formatTextWithImprovedSpacing(windowLines);
      
      writeLog(`[PDF Processing] ${formDescription} address window text:\n${windowText}`);
      
      // Parse the address from the window text
      const addressData = await this.parseAddressFromText(windowText);
      
      // If we got a valid address, return it
      if (await this.isValidAddress(addressData)) {
        writeLog(`[PDF Processing] Valid address found in ${formDescription} window`);
        
        // Calculate confidence score based on validation results
        let confidence = 0.0; // Start with zero confidence
        
        // First check ZIP and city validation
        if (addressData.zipValidationDetails && addressData.zipValidationDetails.matchFound) {
          // ZIP/city validation passed
          confidence += 0.4; // Add 0.4 for successful ZIP/city validation
          writeLog(`[PDF Processing] Adding confidence for successful ZIP/city validation: ${confidence}`);
          
          // Only check street validation if ZIP/city validation passed
          if (addressData.streetValidationDetails && addressData.streetValidationDetails.matchFound) {
            confidence += 0.2; // Add 0.2 for successful street validation
            writeLog(`[PDF Processing] Adding confidence for successful street validation: ${confidence}`);
          } else {
            writeLog(`[PDF Processing] No additional confidence for street validation (failed or not attempted)`);
          }
        } else {
          // ZIP/city validation failed or not attempted
          writeLog(`[PDF Processing] Base confidence remains at ${confidence} due to failed ZIP/city validation`);
          
          // If ZIP/city validation fails, street validation is automatically considered failed
          // because we can only get reliable street names from valid ZIP/city combinations
          if (addressData.streetValidationDetails) {
            addressData.streetValidationDetails.matchFound = false;
          }
        }
        
        // Add a base confidence of 0.4 if we have at least some address data
        if (confidence === 0 && (addressData.name || addressData.street || addressData.postalCode || addressData.city)) {
          confidence = 0.4;
          writeLog(`[PDF Processing] Setting base confidence to 0.4 for partial address data`);
        }
        
        // Return the address with confidence score
        return {
          ...addressData,
          confidence,
          rawText: windowText
        };
      }
      
      // If no valid address found, return an empty address with low confidence
      writeLog(`[PDF Processing] No valid address found in ${formDescription} window`);
      return { 
        confidence: 0.1,
        rawText: windowText || "No valid address found"
      };
    } catch (error: unknown) {
      writeLog(`[PDF Processing] Error in performOcrOnAddressWindow: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error performing OCR on address window:', error);
      throw error;
    }
  }
  
  /**
   * Extract text content that falls within a specific area of the PDF
   * @param content Array of text content items with position information
   * @param top Top position of the area in points
   * @param left Left position of the area in points
   * @param width Width of the area in points
   * @param height Height of the area in points
   * @returns Array of text content items that fall within the area
   */
  private extractTextFromArea(
    content: any[],
    top: number,
    left: number,
    width: number,
    height: number
  ): any[] {
    // Define the boundaries of the area
    const right = left + width;
    const bottom = top + height;
    
    writeLog(`[PDF Processing] Extracting text from area: left=${left}pt (${left/MM_TO_POINTS}mm), top=${top}pt (${top/MM_TO_POINTS}mm), right=${right}pt (${right/MM_TO_POINTS}mm), bottom=${bottom}pt (${bottom/MM_TO_POINTS}mm)`);
    
    // Filter content that falls within the area
    const areaContent = content.filter(item => {
      // Check if the item has position information
      if (!item.x || !item.y) {
        return false;
      }
      
      // Get the item's position and dimensions
      const itemLeft = item.x;
      const itemTop = item.y;
      const itemRight = itemLeft + (item.width || 0);
      const itemBottom = itemTop + (item.height || 0);
      
      // Check if the item overlaps with the area
      const overlaps = (
        itemLeft < right &&
        itemRight > left &&
        itemTop < bottom &&
        itemBottom > top
      );
      
      // If the item overlaps with the area, log it for debugging
      if (overlaps) {
        writeLog(`[PDF Processing] Found text in area: "${item.str}" at (${itemLeft}, ${itemTop})`);
      }
      
      return overlaps;
    });
    
    writeLog(`[PDF Processing] Found ${areaContent.length} text items in area`);
    
    return areaContent;
  }
  
  /**
   * Group text content items by lines based on their y-positions
   * @param content Array of text content items with position information
   * @returns Array of arrays, where each inner array represents a line of text
   */
  private groupTextByLines(content: any[]): any[][] {
    if (content.length === 0) {
      return [];
    }
    
    // Sort content by y-position (top to bottom)
    const sortedContent = [...content].sort((a, b) => a.y - b.y);
    
    // Group items by lines (similar y-positions)
    const lines: any[][] = [];
    let currentLine: any[] = [sortedContent[0]];
    let currentY = sortedContent[0].y;
    
    for (let i = 1; i < sortedContent.length; i++) {
      const item = sortedContent[i];
      
      // If the item's y-position is close to the current line's y-position,
      // add it to the current line; otherwise, start a new line
      if (Math.abs(item.y - currentY) < 5) { // 5 points tolerance
        currentLine.push(item);
      } else {
        // Sort the current line by x-position (left to right)
        currentLine.sort((a, b) => a.x - b.x);
        lines.push(currentLine);
        
        // Start a new line
        currentLine = [item];
        currentY = item.y;
      }
    }
    
    // Add the last line
    if (currentLine.length > 0) {
      // Sort the current line by x-position (left to right)
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * Format text with improved spacing based on the grouped lines
   * This method intelligently determines when to add spaces between text items
   * @param lines Array of arrays, where each inner array represents a line of text
   * @returns Formatted text with proper spacing
   */
  private formatTextWithImprovedSpacing(lines: any[][]): string {
    return lines.map(line => {
      // Process each line to determine proper spacing between text items
      let lineText = '';
      let lastItem = null;
      
      for (let i = 0; i < line.length; i++) {
        const item = line[i];
        
        if (lastItem) {
          // Calculate the gap between this item and the last one
          const gap = item.x - (lastItem.x + lastItem.width);
          
          // Determine if we need to add a space based on the gap size and context
          const needsSpace = this.determineIfSpaceNeeded(lastItem, item, gap);
          
          if (needsSpace) {
            lineText += ' ';
          }
        }
        
        lineText += item.str;
        lastItem = item;
      }
      
      return lineText;
    }).join('\n');
  }
  
  /**
   * Determine if a space is needed between two text items
   * @param lastItem The previous text item
   * @param currentItem The current text item
   * @param gap The gap between the items in points
   * @returns Boolean indicating if a space is needed
   */
  private determineIfSpaceNeeded(lastItem: any, currentItem: any, gap: number): boolean {
    // If the gap is very small, likely no space is needed
    if (gap < 1) return false;
    
    // If the gap is large, likely a space is needed
    if (gap > 10) return true;
    
    // Check if the last character of the previous item is a space
    const lastCharIsSpace = lastItem.str.endsWith(' ');
    if (lastCharIsSpace) return false;
    
    // Check if the first character of the current item is a space
    const firstCharIsSpace = currentItem.str.startsWith(' ');
    if (firstCharIsSpace) return false;
    
    // Check for punctuation that doesn't need a following space
    const lastChar = lastItem.str.charAt(lastItem.str.length - 1);
    if (['(', '[', '{', '-'].includes(lastChar)) return false;
    
    // Check for punctuation that doesn't need a preceding space
    const firstChar = currentItem.str.charAt(0);
    if ([')', ']', '}', ',', '.', ':', ';', '!', '?'].includes(firstChar)) return false;
    
    // For German addresses, check for specific patterns
    // Don't add space before/after certain characters in postal codes
    if (/^\d+$/.test(lastItem.str) && /^\d+$/.test(currentItem.str)) {
      // If both items are digits and the gap is small, likely part of the same number
      if (gap < 5) return false;
    }
    
    // Default to adding a space if the gap is moderate
    return gap > 3;
  }

  /**
   * Parse address from text according to DIN 5008 standards
   * This method identifies recipient address components from the given text,
   * accounting for potential sender information at the top
   * 
   * @param text The text to parse
   * @returns Partial<ExtractedAddress> The extracted address data
   */
  private async parseAddressFromText(text: string): Promise<Partial<ExtractedAddress>> {
    writeLog(`[PDF Processing] Parsing address from text, length: ${text.length}`);
    writeLog(`[PDF Processing] RAW TEXT TO PARSE: "${text}"`);
    
    // Split the text into lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    writeLog(`[PDF Processing] Text split into ${lines.length} non-empty lines`);
    
    // Log each line for debugging
    lines.forEach((line, index) => {
      writeLog(`[PDF Processing] Parse Line ${index}: "${line}"`);
    });
    
    if (lines.length < 3) {
      writeLog('[PDF Processing] Not enough lines for a valid address');
      return {}; // Not enough lines for a valid address
    }
    
    const result: Partial<ExtractedAddress & { 
      zipValidationDetails?: {
        matchFound: boolean;
        originalCity?: string;
        suggestedCity?: string;
        allPossibleCities?: string[];
        mismatch?: boolean;
      }
    }> = {};
    
    // Pattern recognition for address components
    const isPostalCodeLine = (line: string): boolean => {
      return /\b\d{4,5}\b/.test(line); // Contains 4 or 5 digit postal code
    };
    
    const isStreetLine = (line: string): boolean => {
      // Street typically contains numbers, often with a slash or letters after
      return /\b\d+\s*[\/\-]?\s*\w*\b/.test(line) && 
             !isPostalCodeLine(line) && // Not a postal code line
             !/^(Herr|Frau|Herrn|Familie|Firma|Dr\.|Prof\.|Dipl\.)\b/i.test(line); // Not a salutation
    };
    
    const isSalutation = (line: string): boolean => {
      return /^(Herr|Frau|Herrn|Familie|Firma|Dr\.|Prof\.|Dipl\.)\b/i.test(line);
    };
    
    const isSenderLine = (line: string): boolean => {
      // Sender lines often contain dashes and multiple parts
      return line.includes('–') && line.split('–').length >= 3;
    };
    
    // Identify lines by pattern
    let nameLineIndex = -1;
    let streetLineIndex = -1;
    let postalCityLineIndex = -1;
    let salutationLineIndex = -1;
    let senderLineIndex = -1;
    
    // First pass: identify special lines
    for (let i = 0; i < lines.length; i++) {
      if (isSalutation(lines[i])) {
        salutationLineIndex = i;
        writeLog(`[PDF Processing] Identified salutation at line ${i}: "${lines[i]}"`);
      } else if (isSenderLine(lines[i])) {
        senderLineIndex = i;
        writeLog(`[PDF Processing] Identified sender line at line ${i}: "${lines[i]}"`);
      } else if (isPostalCodeLine(lines[i])) {
        postalCityLineIndex = i;
        writeLog(`[PDF Processing] Identified postal code line at line ${i}: "${lines[i]}"`);
      } else if (isStreetLine(lines[i])) {
        streetLineIndex = i;
        writeLog(`[PDF Processing] Identified street line at line ${i}: "${lines[i]}"`);
      }
    }
    
    // Second pass: determine name line based on patterns
    if (salutationLineIndex !== -1) {
      // Name is typically after salutation
      nameLineIndex = salutationLineIndex + 1;
      writeLog(`[PDF Processing] Name line determined from salutation: ${nameLineIndex}`);
    } else if (senderLineIndex !== -1) {
      // Name is typically after sender line
      nameLineIndex = senderLineIndex + 1;
      writeLog(`[PDF Processing] Name line determined from sender line: ${nameLineIndex}`);
    } else if (streetLineIndex !== -1 && streetLineIndex > 0) {
      // Name is typically before street
      nameLineIndex = streetLineIndex - 1;
      writeLog(`[PDF Processing] Name line determined from street position: ${nameLineIndex}`);
    } else if (postalCityLineIndex !== -1 && postalCityLineIndex > 1) {
      // Name is typically two lines before postal/city
      nameLineIndex = postalCityLineIndex - 2;
      writeLog(`[PDF Processing] Name line determined from postal/city position: ${nameLineIndex}`);
    } else {
      // Fallback: assume first line is name
      nameLineIndex = 0;
      writeLog(`[PDF Processing] Name line defaulted to first line: ${nameLineIndex}`);
    }
    
    // Third pass: determine street line if not already found
    if (streetLineIndex === -1) {
      if (postalCityLineIndex !== -1 && postalCityLineIndex > 0) {
        // Street is typically right before postal/city
        streetLineIndex = postalCityLineIndex - 1;
        writeLog(`[PDF Processing] Street line determined from postal/city position: ${streetLineIndex}`);
      } else if (nameLineIndex !== -1) {
        // Street is typically after name
        streetLineIndex = nameLineIndex + 1;
        writeLog(`[PDF Processing] Street line determined from name position: ${streetLineIndex}`);
      } else {
        // Fallback: assume second line is street
        streetLineIndex = Math.min(1, lines.length - 2);
        writeLog(`[PDF Processing] Street line defaulted to second line: ${streetLineIndex}`);
      }
    }
    
    // Fourth pass: determine postal/city line if not already found
    if (postalCityLineIndex === -1) {
      if (streetLineIndex !== -1) {
        // Postal/city is typically after street
        postalCityLineIndex = streetLineIndex + 1;
        writeLog(`[PDF Processing] Postal/city line determined from street position: ${postalCityLineIndex}`);
      } else if (nameLineIndex !== -1) {
        // Postal/city is typically two lines after name
        postalCityLineIndex = nameLineIndex + 2;
        writeLog(`[PDF Processing] Postal/city line determined from name position: ${postalCityLineIndex}`);
      } else {
        // Fallback: assume third line is postal/city
        postalCityLineIndex = Math.min(2, lines.length - 1);
        writeLog(`[PDF Processing] Postal/city line defaulted to third line: ${postalCityLineIndex}`);
      }
    }
    
    // Extract recipient name
    if (nameLineIndex >= 0 && nameLineIndex < lines.length) {
      result.name = lines[nameLineIndex];
      writeLog(`[PDF Processing] Setting name to: "${result.name}"`);
    }
    
    // Extract street
    if (streetLineIndex >= 0 && streetLineIndex < lines.length) {
      result.street = lines[streetLineIndex];
      writeLog(`[PDF Processing] Setting street to: "${result.street}"`);
    }
    
    // Extract postal code and city
    if (postalCityLineIndex >= 0 && postalCityLineIndex < lines.length) {
      const postalCityLine = lines[postalCityLineIndex];
      await this.extractPostalCodeAndCity(postalCityLine, result);
    }
    
    // If we didn't find a postal code yet, check if any line contains a postal code pattern
    if (!result.postalCode) {
      for (let i = 0; i < lines.length; i++) {
        // Skip lines we've already processed
        if (i === nameLineIndex || i === streetLineIndex || i === postalCityLineIndex) {
          continue;
        }
        
        // Check if this line contains a postal code pattern
        const postalCodeMatch = lines[i].match(/\b(\d{4,5})\b/);
        if (postalCodeMatch) {
          writeLog(`[PDF Processing] Found postal code in line ${i}: "${lines[i]}"`);
          await this.extractPostalCodeAndCity(lines[i], result);
          break;
        }
      }
    }
    
    // Extract country if present (line after postal code and city)
    const countryLineIndex = postalCityLineIndex + 1;
    if (countryLineIndex < lines.length) {
      const potentialCountryLine = lines[countryLineIndex];
      
      // If it looks like a country (no numbers, not too long)
      if (!/\b\d+\b/.test(potentialCountryLine) && potentialCountryLine.length < 30) {
        result.country = potentialCountryLine;
        writeLog(`[PDF Processing] Setting country to: "${result.country}"`);
      }
    }
    
    // Validate ZIP code and city match using both internal and external validation
    if (result.postalCode && result.city) {
      try {
        // Store the original city before validation
        const originalCity = result.city;
        
        // Initialize validation details
        result.zipValidationDetails = {
          matchFound: false,
          originalCity: originalCity
        };
        
        // Variables for tracking validation status
        let isValid = true;
        const isAustrian = result.postalCode.length === 4;
        
        // First try internal validation
        const internalValidationResult = await zipValidationService.validateZipCodeCity(
          result.postalCode,
          result.city
        );
        
        // If internal validation fails, try external validation
        if (!internalValidationResult.isValid) {
          writeLog(`[PDF Processing] Internal ZIP code validation failed, trying external validation`);
          
          const externalValidationResult = await externalZipValidationService.validateZipCodeCity(
            result.postalCode,
            result.city
          );
          
          writeLog(`[PDF Processing] External ZIP code validation result: ${JSON.stringify(externalValidationResult)}`);
          
          // Store validation details
          result.zipValidationDetails = {
            matchFound: externalValidationResult.isValid && !externalValidationResult.mismatch,
            originalCity: originalCity,
            suggestedCity: externalValidationResult.suggestedCity,
            allPossibleCities: externalValidationResult.allPossibleCities,
            mismatch: externalValidationResult.mismatch
          };
          
          // Check if the original city is in the list of possible cities
          if (externalValidationResult.allPossibleCities && 
              result.zipValidationDetails && 
              result.zipValidationDetails.originalCity) {
            const originalCity = result.zipValidationDetails.originalCity;
            const isInPossibleCities = externalValidationResult.allPossibleCities.some(
              city => this.normalizeCityForComparison(city) === this.normalizeCityForComparison(originalCity)
            );
            
            if (isInPossibleCities) {
              // If the original city is in the list of possible cities, mark as valid
              writeLog(`[PDF Processing] Original city "${originalCity}" is in the list of possible cities for ZIP code ${result.postalCode}`);
              if (result.zipValidationDetails) {
                result.zipValidationDetails.matchFound = true;
                result.zipValidationDetails.mismatch = false;
              }
            } else {
              // Use the external validation result
              isValid = false;
              writeLog(`[PDF Processing] Address invalidated due to external ZIP code validation failure`);
            }
          } else {
            // Use the external validation result
            isValid = false;
            writeLog(`[PDF Processing] Address invalidated due to external ZIP code validation failure`);
          }
          
          // For Austrian addresses, be more lenient with validation failures
          // The OpenPLZ API might not have complete coverage for Austrian postal codes
          if (!externalValidationResult.isValid && isAustrian) {
            writeLog(`[PDF Processing] Austrian postal code detected, being more lenient with validation`);
            
            // For Austrian addresses, don't invalidate the address just because the API validation failed
            // Instead, apply a smaller confidence adjustment
            isValid = true;
          } else if (!externalValidationResult.isValid) {
            // For non-Austrian addresses, log the validation failure
            writeLog(`[PDF Processing] ZIP code validation failed for non-Austrian address`);
          }
          
          // Only update the city if it's a valid match and not a mismatch
          if (externalValidationResult.suggestedCity && 
              externalValidationResult.isValid && 
              !externalValidationResult.mismatch) {
            writeLog(`[PDF Processing] Validated city: "${result.city}" matches "${externalValidationResult.suggestedCity}" (not replacing original)`);
            if (result.zipValidationDetails) {
              result.zipValidationDetails.suggestedCity = externalValidationResult.suggestedCity;
            }
            // Do not replace the original city
            // result.city = externalValidationResult.suggestedCity;
          } else if (externalValidationResult.mismatch) {
            // Log the mismatch but don't change the city
            writeLog(`[PDF Processing] ZIP code and city mismatch detected. Original: "${result.city}", Suggested: "${externalValidationResult.suggestedCity}" (keeping original)`);
            
            // Log all possible cities if available
            if (externalValidationResult.allPossibleCities && externalValidationResult.allPossibleCities.length > 0) {
              writeLog(`[PDF Processing] All possible cities for ZIP code ${result.postalCode}: ${externalValidationResult.allPossibleCities.join(', ')}`);
            }
          }
          
          // Set the country based on the validation result if not already set
          if (externalValidationResult.country && !result.country) {
            result.country = externalValidationResult.country;
            writeLog(`[PDF Processing] Setting country based on external validation: "${result.country}"`);
          }
        } else {
          // Internal validation succeeded
          writeLog(`[PDF Processing] Internal ZIP code validation result: ${JSON.stringify(internalValidationResult)}`);
          
          // Store validation details
          if (!result.zipValidationDetails) {
            result.zipValidationDetails = {
              matchFound: internalValidationResult.isValid,
              originalCity: result.city
            };
          } else {
            result.zipValidationDetails.matchFound = internalValidationResult.isValid;
            result.zipValidationDetails.mismatch = internalValidationResult.mismatch;
            result.zipValidationDetails.suggestedCity = internalValidationResult.suggestedCity;
            result.zipValidationDetails.allPossibleCities = internalValidationResult.allPossibleCities;
          }
          
          // Check if the original city is in the list of possible cities
          if (internalValidationResult.allPossibleCities && 
              result.zipValidationDetails && 
              result.zipValidationDetails.originalCity) {
            const originalCity = result.zipValidationDetails.originalCity;
            const isInPossibleCities = internalValidationResult.allPossibleCities.some(
              city => this.normalizeCityForComparison(city) === this.normalizeCityForComparison(originalCity)
            );
            
            if (isInPossibleCities) {
              // If the original city is in the list of possible cities, mark as valid
              writeLog(`[PDF Processing] Original city "${originalCity}" is in the list of possible cities for ZIP code ${result.postalCode}`);
              if (result.zipValidationDetails) {
                result.zipValidationDetails.matchFound = true;
                result.zipValidationDetails.mismatch = false;
              }
            }
          }
          
          // Only update the city if it's a valid match and not a mismatch
          if (internalValidationResult.suggestedCity && 
              internalValidationResult.isValid && 
              !internalValidationResult.mismatch) {
            writeLog(`[PDF Processing] Validated city: "${result.city}" matches "${internalValidationResult.suggestedCity}" (not replacing original)`);
            if (result.zipValidationDetails) {
              result.zipValidationDetails.suggestedCity = internalValidationResult.suggestedCity;
            }
            // Do not replace the original city
            // result.city = internalValidationResult.suggestedCity;
          } else if (internalValidationResult.mismatch) {
            // Log the mismatch but don't change the city
            writeLog(`[PDF Processing] ZIP code and city mismatch detected. Original: "${result.city}", Suggested: "${internalValidationResult.suggestedCity}" (keeping original)`);
            
            // Log all possible cities if available
            if (internalValidationResult.allPossibleCities && internalValidationResult.allPossibleCities.length > 0) {
              writeLog(`[PDF Processing] All possible cities for ZIP code ${result.postalCode}: ${internalValidationResult.allPossibleCities.join(', ')}`);
            }
          }
          
          // Set the country based on the validation result if not already set
          if (internalValidationResult.country && !result.country) {
            result.country = internalValidationResult.country;
            writeLog(`[PDF Processing] Setting country based on internal validation: "${result.country}"`);
          }
        }
      } catch (error) {
        writeLog(`[PDF Processing] Error validating ZIP code: ${error}`);
        // Continue without validation
      }
    }
    
    // Add street validation if we have a street, postal code, and city
    if (result.street && result.postalCode && result.city) {
      try {
        // Store the original street before validation
        const originalStreet = result.street;
        
        // Initialize street validation details
        result.streetValidationDetails = {
          matchFound: false,
          originalStreet: originalStreet
        };
        
        // Perform street validation
        const streetValidationResult = await streetValidationService.validateStreet(
          result.street,
          result.postalCode,
          result.city
        );
        
        writeLog(`[PDF Processing] Street validation result: ${JSON.stringify(streetValidationResult)}`);
        
        // Store validation details
        result.streetValidationDetails.matchFound = streetValidationResult.isValid && !streetValidationResult.mismatch;
        result.streetValidationDetails.mismatch = streetValidationResult.mismatch;
        result.streetValidationDetails.suggestedStreet = streetValidationResult.suggestedStreet;
        result.streetValidationDetails.allPossibleStreets = streetValidationResult.allPossibleStreets;
        
        // Only update the street if it's a valid match and not a mismatch
        if (streetValidationResult.suggestedStreet && 
            streetValidationResult.isValid && 
            !streetValidationResult.mismatch) {
          writeLog(`[PDF Processing] Validated street: "${result.street}" matches "${streetValidationResult.suggestedStreet}" (not replacing original)`);
          // Do not replace the original street name
          // result.street = streetValidationResult.suggestedStreet;
        } else if (streetValidationResult.mismatch) {
          // Log the mismatch but don't change the street
          writeLog(`[PDF Processing] Street mismatch detected. Original: "${result.street}", Suggested: "${streetValidationResult.suggestedStreet}" (keeping original)`);
          
          // Log all possible streets if available
          if (streetValidationResult.allPossibleStreets && streetValidationResult.allPossibleStreets.length > 0) {
            writeLog(`[PDF Processing] All possible streets for ${result.postalCode} ${result.city}: ${streetValidationResult.allPossibleStreets.join(', ')}`);
          }
        }
        
        // For Austrian addresses, be more lenient with street validation failures
        const isAustrian = result.postalCode.length === 4;
        if (!streetValidationResult.isValid && isAustrian) {
          writeLog(`[PDF Processing] Austrian address detected, being more lenient with street validation`);
        }
      } catch (error) {
        writeLog(`[PDF Processing] Error validating street: ${error}`);
        // Continue without street validation
      }
    }
    
    writeLog(`[PDF Processing] Parsed address result: ${JSON.stringify(result)}`);
    return result;
  }
  
  /**
   * Extract postal code and city from a line
   * @param line Line containing postal code and city
   * @param result Address object to update
   */
  private async extractPostalCodeAndCity(line: string, result: Partial<ExtractedAddress>): Promise<void> {
    // Clean up the line by normalizing spaces in postal codes
    const cleanedLine = this.normalizePostalCodeSpaces(line);
    
    // Match either 5-digit German or 4-digit Austrian postal codes
    const postalMatch = cleanedLine.match(/\b(\d{4,5})\b/);
    
    if (postalMatch) {
      result.postalCode = postalMatch[1];
      const isGerman = result.postalCode.length === 5;
      const isAustrian = result.postalCode.length === 4;
      writeLog(`[PDF Processing] Found ${isGerman ? 'German' : 'Austrian'} postal code: "${result.postalCode}"`);
      
      // Set country based on ZIP code format if not already set
      if (!result.country) {
        result.country = isGerman ? 'Germany' : 'Austria';
        writeLog(`[PDF Processing] Setting country based on ZIP code format: "${result.country}"`);
      }
      
      // City is typically after the postal code
      const cityPart = cleanedLine.substring(postalMatch.index! + postalMatch[0].length).trim();
      if (cityPart) {
        // For Austrian addresses, handle special district format (e.g., "Wien, Josefstadt")
        if (isAustrian && cityPart.toLowerCase().startsWith('wien')) {
          result.city = this.normalizeCity(cityPart);
          writeLog(`[PDF Processing] Setting Austrian city to: "${result.city}"`);
        } else {
          result.city = this.normalizeCity(cityPart);
          writeLog(`[PDF Processing] Setting city to: "${result.city}"`);
        }
      } else {
        // If the line only contains a postal code, try to infer the city from the database
        try {
          const zipEntry = await zipValidationService.validateZipCode(result.postalCode);
          if (zipEntry && zipEntry.city) {
            result.city = zipEntry.city;
            writeLog(`[PDF Processing] Inferred city from database: "${result.city}"`);
          } else {
            // Try external validation for Austrian postal codes
            if (isAustrian) {
              try {
                const externalValidationResult = await externalZipValidationService.validateZipCode(result.postalCode);
                if (externalValidationResult.isValid && externalValidationResult.city) {
                  result.city = externalValidationResult.city;
                  writeLog(`[PDF Processing] Inferred Austrian city from external API: "${result.city}"`);
                }
              } catch (error) {
                writeLog(`[PDF Processing] Error inferring city from external API: ${error}`);
              }
            } else {
              writeLog(`[PDF Processing] Could not infer city for postal code: "${result.postalCode}"`);
            }
          }
        } catch (error) {
          writeLog(`[PDF Processing] Error inferring city from postal code: ${error}`);
        }
      }
    } else if (line.trim().match(/^[A-Za-zÄÖÜäöüß\s\-,]+$/)) {
      // If the line contains only letters (no postal code), it might be just the city
      // This handles cases where postal code and city are on separate lines
      if (!result.city) {
        result.city = this.normalizeCity(line.trim());
        writeLog(`[PDF Processing] Setting city from text-only line: "${result.city}"`);
        
        // If we have a postal code but no city, try to validate the postal code with this city
        if (result.postalCode) {
          try {
            const validationResult = await zipValidationService.validateZipCodeCity(
              result.postalCode,
              result.city
            );
            
            if (!validationResult.isValid) {
              // Try external validation
              try {
                const externalValidationResult = await externalZipValidationService.validateZipCodeCity(
                  result.postalCode,
                  result.city
                );
                
                if (externalValidationResult.isValid) {
                  writeLog(`[PDF Processing] Validated city "${result.city}" with postal code "${result.postalCode}" using external API`);
                }
              } catch (error) {
                writeLog(`[PDF Processing] Error validating city with external API: ${error}`);
              }
            }
          } catch (error) {
            writeLog(`[PDF Processing] Error validating city: ${error}`);
          }
        }
      }
    } else {
      // If somehow we got here but there's no postal code, use the whole line as city
      if (!result.city) {
        result.city = this.normalizeCity(cleanedLine);
        writeLog(`[PDF Processing] No postal code found, setting city to: "${result.city}"`);
      }
    }
  }

  /**
   * Normalize spaces in postal codes
   * This specifically targets the issue of postal codes being split with spaces
   * @param line The line to normalize
   * @returns Normalized line with corrected postal code spacing
   */
  private normalizePostalCodeSpaces(line: string): string {
    // Fix common postal code spacing issues
    // Example: "1 0 80 Wien" -> "1080 Wien"
    return line.replace(/(\d)\s+(\d)\s+(\d{2})\b/g, '$1$2$3')
              .replace(/(\d)\s+(\d{3})\b/g, '$1$2')
              .replace(/(\d{2})\s+(\d{2})\b/g, '$1$2')
              .replace(/(\d{3})\s+(\d{1})\b/g, '$1$2')
              .replace(/(\d{4})\s+(\d{1})\b/g, '$1$2');
  }

  /**
   * Normalize city name for display purposes
   * This preserves the original case but removes special characters
   */
  private normalizeCity(city: string): string {
    return city
      .trim()
      // Remove special characters
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace umlauts but preserve case
      .replace(/ä/g, 'a').replace(/Ä/g, 'A')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ß/g, 'ss');
  }

  /**
   * Normalize city name for comparison purposes
   * This converts to lowercase for case-insensitive comparison
   */
  private normalizeCityForComparison(city: string): string {
    return this.normalizeCity(city).toLowerCase();
  }

  /**
   * Validate if the extracted address has the minimum required fields
   * @param address Partial address object to validate
   * @returns boolean indicating if the address is valid
   */
  private async isValidAddress(address: Partial<ExtractedAddress>): Promise<boolean> {
    // Check if we have enough information to consider this a valid address
    const hasName = !!address.name;
    const hasStreet = !!address.street;
    const hasCityOrPostalCode = !!address.city || !!address.postalCode;
    
    // Log what we have
    writeLog(`[PDF Processing] Has name: ${hasName}, Has street: ${hasStreet}, Has city or postal code: ${hasCityOrPostalCode}`);
    
    // We need at least a street and either a city or postal code
    if (!hasStreet || !hasCityOrPostalCode) {
      return false;
    }
    
    // Validate ZIP code and city if both are present
    if (address.postalCode && address.city) {
      try {
        // Store the original city before validation
        const originalCity = address.city;
        
        // Initialize validation details if not already present
        if (!address.zipValidationDetails) {
          address.zipValidationDetails = {
            matchFound: false,
            originalCity: originalCity
          };
        }
        
        // Variables for tracking validation status
        const isAustrian = address.postalCode.length === 4;
        
        // First try internal validation
        const internalValidationResult = await zipValidationService.validateZipCodeCity(
          address.postalCode,
          address.city
        );
        
        // Store validation details
        address.zipValidationDetails.matchFound = internalValidationResult.isValid && !internalValidationResult.mismatch;
        address.zipValidationDetails.originalCity = originalCity;
        address.zipValidationDetails.suggestedCity = internalValidationResult.suggestedCity;
        address.zipValidationDetails.allPossibleCities = internalValidationResult.allPossibleCities;
        address.zipValidationDetails.mismatch = internalValidationResult.mismatch;
        
        // If internal validation fails, try external validation
        if (!internalValidationResult.isValid) {
          writeLog(`[PDF Processing] Internal ZIP code validation failed, trying external validation`);
          
          const externalValidationResult = await externalZipValidationService.validateZipCodeCity(
            address.postalCode,
            address.city
          );
          
          writeLog(`[PDF Processing] External ZIP code validation result: ${JSON.stringify(externalValidationResult)}`);
          
          // Store validation details
          address.zipValidationDetails.matchFound = externalValidationResult.isValid && !externalValidationResult.mismatch;
          address.zipValidationDetails.originalCity = originalCity;
          address.zipValidationDetails.suggestedCity = externalValidationResult.suggestedCity;
          address.zipValidationDetails.allPossibleCities = externalValidationResult.allPossibleCities;
          address.zipValidationDetails.mismatch = externalValidationResult.mismatch;
          
          // Check if the original city is in the list of possible cities
          if (externalValidationResult.allPossibleCities && 
              address.zipValidationDetails && 
              address.zipValidationDetails.originalCity) {
            const originalCity = address.zipValidationDetails.originalCity;
            const isInPossibleCities = externalValidationResult.allPossibleCities.some(
              city => this.normalizeCityForComparison(city) === this.normalizeCityForComparison(originalCity)
            );
            
            if (isInPossibleCities) {
              // If the original city is in the list of possible cities, mark as valid
              writeLog(`[PDF Processing] Original city "${originalCity}" is in the list of possible cities for ZIP code ${address.postalCode}`);
              if (address.zipValidationDetails) {
                address.zipValidationDetails.matchFound = true;
                address.zipValidationDetails.mismatch = false;
              }
            }
          }
          
          // For Austrian addresses, be more lenient with validation failures
          // The OpenPLZ API might not have complete coverage for Austrian postal codes
          if (!externalValidationResult.isValid && isAustrian) {
            writeLog(`[PDF Processing] Austrian postal code detected, being more lenient with validation`);
            
            // Don't invalidate the address for Austrian postal codes
            if (address.country === 'Austria' || address.postalCode.length === 4) {
              writeLog(`[PDF Processing] Keeping Austrian address valid despite validation failure`);
              // We don't change the matchFound status, but we keep the address valid
            }
          } else if (!externalValidationResult.isValid) {
            // For non-Austrian addresses, log the validation failure
            writeLog(`[PDF Processing] ZIP code validation failed for non-Austrian address`);
          }
          
          // Log the mismatch if there is one
          if (externalValidationResult.mismatch) {
            writeLog(`[PDF Processing] ZIP code and city mismatch detected. Original: "${address.city}", Suggested: "${externalValidationResult.suggestedCity}" (keeping original)`);
            
            // Log all possible cities if available
            if (externalValidationResult.allPossibleCities && externalValidationResult.allPossibleCities.length > 0) {
              writeLog(`[PDF Processing] All possible cities for ZIP code ${address.postalCode}: ${externalValidationResult.allPossibleCities.join(', ')}`);
            }
          }
          
          // Set the country based on the validation result if not already set
          if (externalValidationResult.country && !address.country) {
            address.country = externalValidationResult.country;
            writeLog(`[PDF Processing] Setting country based on external validation: "${address.country}"`);
          }
        } else {
          // Log the internal validation result
          writeLog(`[PDF Processing] Internal ZIP code validation result: ${JSON.stringify(internalValidationResult)}`);
          
          // Log the mismatch if there is one
          if (internalValidationResult.mismatch) {
            writeLog(`[PDF Processing] ZIP code and city mismatch detected. Original: "${address.city}", Suggested: "${internalValidationResult.suggestedCity}" (keeping original)`);
            
            // Log all possible cities if available
            if (internalValidationResult.allPossibleCities && internalValidationResult.allPossibleCities.length > 0) {
              writeLog(`[PDF Processing] All possible cities for ZIP code ${address.postalCode}: ${internalValidationResult.allPossibleCities.join(', ')}`);
            }
          }
          
          // Set the country based on the validation result if not already set
          if (internalValidationResult.country && !address.country) {
            address.country = internalValidationResult.country;
            writeLog(`[PDF Processing] Setting country based on internal validation: "${address.country}"`);
          }
        }
      } catch (error) {
        writeLog(`[PDF Processing] Error validating ZIP code: ${error}`);
        // Continue without validation
      }
    }
    
    // Add street validation if we have a street, postal code, and city
    if (address.street && address.postalCode && address.city) {
      try {
        // Store the original street before validation
        const originalStreet = address.street;
        
        // Initialize street validation details if not already present
        if (!address.streetValidationDetails) {
          address.streetValidationDetails = {
            matchFound: false,
            originalStreet: originalStreet
          };
        }
        
        // Only perform street validation if ZIP/city validation passed
        if (address.zipValidationDetails && address.zipValidationDetails.matchFound) {
          // Perform street validation
          const streetValidationResult = await streetValidationService.validateStreet(
            address.street,
            address.postalCode,
            address.city
          );
          
          writeLog(`[PDF Processing] Street validation result: ${JSON.stringify(streetValidationResult)}`);
          
          // Store validation details
          address.streetValidationDetails.matchFound = streetValidationResult.isValid && !streetValidationResult.mismatch;
          address.streetValidationDetails.mismatch = streetValidationResult.mismatch;
          address.streetValidationDetails.suggestedStreet = streetValidationResult.suggestedStreet;
          address.streetValidationDetails.allPossibleStreets = streetValidationResult.allPossibleStreets;
          
          // Log the validation result
          if (streetValidationResult.mismatch) {
            writeLog(`[PDF Processing] Street mismatch detected. Original: "${address.street}", Suggested: "${streetValidationResult.suggestedStreet}" (keeping original)`);
          } else if (streetValidationResult.isValid) {
            writeLog(`[PDF Processing] Validated street: "${address.street}" matches "${streetValidationResult.suggestedStreet}" (not replacing original)`);
          }
        } else {
          // If ZIP/city validation failed, street validation automatically fails
          address.streetValidationDetails.matchFound = false;
          writeLog(`[PDF Processing] Street validation skipped due to failed ZIP/city validation`);
        }
      } catch (error) {
        writeLog(`[PDF Processing] Error validating street: ${error}`);
        // Continue without validation
      }
    }
    
    // Log the final validation result
    writeLog(`[PDF Processing] Address validation result: ${true} for ${JSON.stringify(address)}`);
    
    // Return true if we have enough information
    return hasStreet && hasCityOrPostalCode;
  }
}

// Export a singleton instance
export const pdfProcessingService = new PdfProcessingService();