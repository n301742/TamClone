/**
 * Types for the BriefButler API service
 */

/**
 * Letter submission data for BriefButler
 */
export interface LetterSubmissionData {
  pdfPath: string;
  profileId: string;
  recipientName: string;
  recipientFirstName?: string; // First/given name of the recipient
  recipientLastName?: string;  // Last/family name of the recipient
  recipientAddress: string;
  recipientCity: string;
  recipientZip: string;
  recipientCountry: string;
  recipientState?: string;
  isExpress: boolean;
  isRegistered: boolean;
  isColorPrint: boolean;
  isDuplexPrint: boolean;
}

/**
 * Response from the BriefButler API
 */
export interface BriefButlerApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message: string;
}

/**
 * Letter status from the BriefButler API
 */
export interface LetterStatus {
  trackingId: string;
  status: string;
  timestamp: string;
  details?: {
    deliveryDate?: string;
    estimatedArrival?: string;
    currentLocation?: string;
    events?: LetterStatusEvent[];
  };
}

/**
 * Letter status event
 */
export interface LetterStatusEvent {
  date: string;
  description: string;
  location?: string;
}

/**
 * User profile from the BriefButler API
 */
export interface UserProfile {
  id: string;
  name: string;
  address: string;
  city?: string;
  zip?: string;
  country?: string;
  state?: string;
  defaultSender?: boolean;
}

/**
 * Spool service submission data for dual delivery
 */
export interface SpoolSubmissionData {
  pdfPath: string;           // Path to the PDF file to be sent
  recipientName: string;     // Name of the recipient (full name)
  recipientFirstName?: string; // First/given name of the recipient
  recipientLastName?: string;  // Last/family name of the recipient
  recipientAcademicTitle?: string; // Academic title (Dr., Prof., etc.)
  recipientAddress: string;  // Street address of the recipient
  recipientCity: string;     // City of the recipient
  recipientZip: string;      // ZIP/Postal code of the recipient
  recipientCountry: string;  // Country of the recipient
  recipientState?: string;   // State/Province of the recipient (optional)
  recipientEmail?: string;   // Email address of the recipient (optional)
  recipientPhone?: string;   // Phone number of the recipient (optional)
  senderName: string;        // Name of the sender
  senderAddress: string;     // Street address of the sender
  senderCity: string;        // City of the sender
  senderZip: string;         // ZIP/Postal code of the sender
  senderCountry: string;     // Country of the sender
  senderState?: string;      // State/Province of the sender (optional)
  reference?: string;        // Reference identifier for the delivery (optional)
  isColorPrint?: boolean;    // Whether to print in color (optional, default: false)
  isDuplexPrint?: boolean;   // Whether to print duplex/double-sided (optional, default: true)
  isExpress?: boolean;       // Whether to use express delivery (optional)
  isRegistered?: boolean;    // Whether to use registered mail (optional)
  deliveryProfile?: string;  // Delivery profile to use (optional, default: "briefbutler-test")
  priority?: string;         // Priority level for delivery (optional, e.g., 'NORMAL', 'PRIORITY')
}

// DualDelivery Request Types

export interface DualDeliveryRequest {
  metadata: Metadata;
  configuration: ProcessingInstructions;
  receiver: Receiver;
  sender?: Sender;
  subject?: string;
  documents: Document[];
}

export interface Metadata {
  deliveryId: string;
  caseId?: string;
}

export interface ProcessingInstructions {
  deliveryProfile: string;
  allowEmail?: boolean;
  costcenter?: string;
}

export interface Receiver {
  email?: string;
  phoneNumber?: string;
  recipient?: Person;
  postalAddress?: PostalAddress;
}

export interface Sender {
  person: Person;
  postalAddress?: PostalAddress;
}

export interface Person {
  physicalPerson?: PhysicalPerson;
  legalPerson?: LegalPerson;
}

export interface PhysicalPerson {
  familyName: string;
  givenName: string;
  dateOfBirth?: string;
  prefixTitle?: string;
  postfixTitle?: string;
}

export interface LegalPerson {
  name: string;
}

export interface PostalAddress {
  street: string;
  number?: string;
  postalCode?: string;
  city?: string;
  countryCode: string;
}

export interface Document {
  content: string; // Base64 encoded content
  mimeType: string;
  name: string;
  type?: string;
  realm: string;
}

// DualDelivery Response Types

export interface DualDeliveryResponse {
  trackingId: string;
}

// Status Types

export interface DeliveryStateResponse {
  trackingId: string;
  recoIds?: string[];
  deliveryId?: string;
  state?: DeliveryStateRecord;
  history: DeliveryStateRecord[];
}

export interface DeliveryStateRecord {
  timestamp: string;
  created: string;
  updated: string;
  channel?: string;
  stateName: string;
  stateCode: number;
  returnReceiptDocuments?: ReturnReceiptDocument[];
  outgoingDocuments?: DeliveryDocument[];
  details?: DeliveryStateDetails[];
}

export interface DeliveryStateDetails {
  detailStateName: string;
  detailStateCode?: number;
  timestamp: string;
  additionalData?: Record<string, string>;
}

export interface ReturnReceiptDocument {
  documentId: string;
  name: string;
}

export interface DeliveryDocument {
  documentId: string;
  name: string;
  type?: string;
  mimetype?: string;
  size?: number;
  createdAt?: string;
  availableUntil?: string;
  deletedAt?: string;
} 