// Sender profile information
export interface SenderProfile {
  id: string;
  userId: string;
  name: string;
  companyName?: string;
  isCompany: boolean;
  address: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  email?: string;
  phone?: string;
  isDefault: boolean;
  deliveryProfile?: string;
  createdAt: string;
  updatedAt: string;
} 