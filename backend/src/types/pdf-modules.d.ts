/**
 * Type declarations for PDF processing modules
 */

declare module 'pdf-parse' {
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: {
      PDFFormatVersion: string;
      IsAcroFormPresent: boolean;
      IsXFAPresent: boolean;
      [key: string]: any;
    };
    metadata: any;
    text: string;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: any): Promise<PDFParseResult>;
  
  export = pdfParse;
}

declare module 'node-tesseract-ocr' {
  interface TesseractOptions {
    lang?: string;
    oem?: number;
    psm?: number;
    [key: string]: any;
  }

  function recognize(image: string, options?: TesseractOptions): Promise<string>;
  
  export = { recognize };
} 