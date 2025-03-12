import apiClient from './ApiClient';
import type { Letter, CreateLetterRequest, UpdateLetterRequest, LetterStatusHistory } from './types';

/**
 * Letter service for handling letter-related API calls
 */
class LetterService {
  /**
   * Endpoint for letter API
   */
  private endpoint = '/api/letters';

  /**
   * Get all letters for the current user
   * @returns Promise with array of letters
   */
  public async getLetters(): Promise<Letter[]> {
    return await apiClient.get<Letter[]>(this.endpoint);
  }

  /**
   * Get letter by ID
   * @param id - Letter ID
   * @returns Promise with letter details
   */
  public async getLetterById(id: string): Promise<Letter> {
    return await apiClient.get<Letter>(`${this.endpoint}/${id}`);
  }

  /**
   * Create a new letter with a PDF file
   * @param data - Letter data
   * @param pdfFile - PDF file to upload
   * @param onUploadProgress - Optional callback for upload progress
   * @returns Promise with the created letter
   */
  public async createLetter(
    data: CreateLetterRequest,
    pdfFile: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<Letter> {
    const formData = new FormData();
    
    // Add letter data to FormData
    formData.append('title', data.title);
    if (data.recipientId) formData.append('recipientId', data.recipientId);
    if (data.senderId) formData.append('senderId', data.senderId);
    
    // Add PDF file to FormData
    formData.append('pdfFile', pdfFile);
    
    return await apiClient.uploadFile<Letter>(this.endpoint, formData, onUploadProgress);
  }

  /**
   * Update an existing letter
   * @param id - Letter ID
   * @param data - Updated letter data
   * @returns Promise with the updated letter
   */
  public async updateLetter(id: string, data: UpdateLetterRequest): Promise<Letter> {
    return await apiClient.put<Letter>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Delete a letter
   * @param id - Letter ID
   * @returns Promise with void
   */
  public async deleteLetter(id: string): Promise<void> {
    return await apiClient.delete(`${this.endpoint}/${id}`);
  }

  /**
   * Get letter status history
   * @param id - Letter ID
   * @returns Promise with array of status history entries
   */
  public async getLetterStatusHistory(id: string): Promise<LetterStatusHistory[]> {
    return await apiClient.get<LetterStatusHistory[]>(`${this.endpoint}/${id}/status`);
  }

  /**
   * Send a letter to BriefButler API for processing
   * @param id - Letter ID
   * @returns Promise with the updated letter
   */
  public async sendLetter(id: string): Promise<Letter> {
    return await apiClient.post<Letter>(`${this.endpoint}/${id}/send`);
  }
}

// Create and export a singleton instance
const letterService = new LetterService();
export default letterService; 