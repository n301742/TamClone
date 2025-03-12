/**
 * API Data Models and Interfaces
 * This file contains TypeScript interfaces for the data models used in the API
 */

// User related interfaces
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Letter related interfaces
export interface Letter {
  id: string;
  userId: string;
  title: string;
  content?: string;
  recipientId?: string;
  senderId?: string;
  pdfUrl?: string;
  status: LetterStatus;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export enum LetterStatus {
  DRAFT = 'DRAFT',
  PROCESSING = 'PROCESSING',
  READY_TO_SEND = 'READY_TO_SEND',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  ERROR = 'ERROR'
}

export interface LetterStatusHistory {
  id: string;
  letterId: string;
  status: LetterStatus;
  message?: string;
  createdAt: string;
}

export interface CreateLetterRequest {
  title: string;
  recipientId?: string;
  senderId?: string;
  // pdfFile handled separately in FormData
}

export interface UpdateLetterRequest {
  title?: string;
  content?: string;
  recipientId?: string;
  senderId?: string;
}

// Address Book related interfaces
export interface Address {
  id: string;
  userId: string;
  name: string;
  company?: string;
  streetAddress: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressRequest {
  name: string;
  company?: string;
  streetAddress: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface UpdateAddressRequest {
  name?: string;
  company?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

// Error response interface
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
} 