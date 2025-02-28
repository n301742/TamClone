import fs from 'fs';
import path from 'path';
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
  rawText: string;
  confidence: number;
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
      
      // Convert lines to text
      const windowText = windowLines
        .map(line => line.map(item => item.str).join(' '))
        .join('\n');
      
      writeLog(`[PDF Processing] ${formDescription} address window text:\n${windowText}`);
      
      // Parse the address from the window text
      const addressData = this.parseAddressFromText(windowText);
      
      // If we got a valid address, return it
      if (this.isValidAddress(addressData)) {
        writeLog(`[PDF Processing] Valid address found in ${formDescription} window`);
        return { 
          ...addressData, 
          confidence: 0.9,
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
   * Parse address from text according to DIN 5008 standards
   * This method identifies recipient address components from the given text,
   * accounting for potential sender information at the top
   * 
   * @param text The text to parse
   * @returns Partial<ExtractedAddress> The extracted address data
   */
  private parseAddressFromText(text: string): Partial<ExtractedAddress> {
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
    
    const result: Partial<ExtractedAddress> = {};
    
    // In German DIN 5008 format, the address window typically contains:
    // Line 0: Sender information (e.g., "Stadt Paderborn - Marienplatz 11a - 33098 Paderborn")
    // Line 1: Salutation (e.g., "Frau" or "Herr")
    // Line 2: Recipient name
    // Line 3: Street and house number
    // Line 4: Postal code and city
    // Line 5: Optional country (for international mail)
    
    // Identify the sender information (first line)
    if (lines.length > 0) {
      writeLog(`[PDF Processing] Identified sender info: "${lines[0]}"`);
    }
    
    // Identify salutation (second line)
    const isSalutation = (line: string): boolean => {
      return /^(Herr|Frau|Herrn|Familie|Firma|Dr\.|Prof\.|Dipl\.)\b/i.test(line);
    };
    
    let salutationLine = -1;
    if (lines.length > 1 && isSalutation(lines[1])) {
      salutationLine = 1;
      writeLog(`[PDF Processing] Identified salutation: "${lines[1]}"`);
    }
    
    // Extract recipient name (line after salutation or third line)
    const nameLineIndex = salutationLine !== -1 ? salutationLine + 1 : 2;
    if (nameLineIndex < lines.length) {
      result.name = lines[nameLineIndex];
      writeLog(`[PDF Processing] Setting name to: "${result.name}"`);
    }
    
    // Extract street (line after name)
    const streetLineIndex = nameLineIndex + 1;
    if (streetLineIndex < lines.length) {
      result.street = lines[streetLineIndex];
      writeLog(`[PDF Processing] Setting street to: "${result.street}"`);
    }
    
    // Extract postal code and city (line after street)
    const postalCityLineIndex = streetLineIndex + 1;
    if (postalCityLineIndex < lines.length) {
      const postalCityLine = lines[postalCityLineIndex];
      this.extractPostalCodeAndCity(postalCityLine, result);
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
    
    writeLog(`[PDF Processing] Parsed address result: ${JSON.stringify(result)}`);
    return result;
  }
  
  /**
   * Extract postal code and city from a line
   * @param line Line containing postal code and city
   * @param result Address object to update
   */
  private extractPostalCodeAndCity(line: string, result: Partial<ExtractedAddress>): void {
    // Match either 5-digit German or 4-digit Austrian postal codes
    const postalMatch = line.match(/\b(\d{4,5})\b/);
    
    if (postalMatch) {
      result.postalCode = postalMatch[1];
      const isGerman = result.postalCode.length === 5;
      writeLog(`[PDF Processing] Found ${isGerman ? 'German' : 'Austrian'} postal code: "${result.postalCode}"`);
      
      // City is typically after the postal code
      const cityPart = line.substring(postalMatch.index! + postalMatch[0].length).trim();
      if (cityPart) {
        result.city = cityPart;
        writeLog(`[PDF Processing] Setting city to: "${result.city}"`);
      }
    } else {
      // If somehow we got here but there's no postal code, use the whole line as city
      result.city = line;
      writeLog(`[PDF Processing] No postal code found, setting city to: "${result.city}"`);
    }
  }

  /**
   * Validate if the extracted address has the minimum required fields
   * @param address Partial address object to validate
   * @returns boolean indicating if the address is valid
   */
  private isValidAddress(address: Partial<ExtractedAddress>): boolean {
    // For a valid address, we need at least:
    // 1. A name
    // 2. A street
    // 3. Either a city or a postal code
    
    const hasName = !!address.name;
    const hasStreet = !!address.street;
    const hasCityOrPostalCode = !!(address.city || address.postalCode);
    
    const isValid = hasName && hasStreet && hasCityOrPostalCode;
    
    writeLog(`[PDF Processing] Address validation result: ${isValid} for ${JSON.stringify(address)}`);
    writeLog(`[PDF Processing] Has name: ${hasName}, Has street: ${hasStreet}, Has city or postal code: ${hasCityOrPostalCode}`);
    
    return isValid;
  }
}

// Export a singleton instance
export const pdfProcessingService = new PdfProcessingService(); 