import apiClient from './ApiClient';
import type { Address, CreateAddressRequest, UpdateAddressRequest } from './types';

/**
 * Address Book service for handling address-related API calls
 */
class AddressBookService {
  /**
   * Endpoint for address book API
   */
  private endpoint = '/api/address-book';

  /**
   * Get all addresses for the current user
   * @returns Promise with array of addresses
   */
  public async getAddresses(): Promise<Address[]> {
    return await apiClient.get<Address[]>(this.endpoint);
  }

  /**
   * Get address by ID
   * @param id - Address ID
   * @returns Promise with address details
   */
  public async getAddressById(id: string): Promise<Address> {
    return await apiClient.get<Address>(`${this.endpoint}/${id}`);
  }

  /**
   * Create a new address
   * @param data - Address data
   * @returns Promise with the created address
   */
  public async createAddress(data: CreateAddressRequest): Promise<Address> {
    return await apiClient.post<Address>(this.endpoint, data);
  }

  /**
   * Update an existing address
   * @param id - Address ID
   * @param data - Updated address data
   * @returns Promise with the updated address
   */
  public async updateAddress(id: string, data: UpdateAddressRequest): Promise<Address> {
    return await apiClient.put<Address>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Delete an address
   * @param id - Address ID
   * @returns Promise with void
   */
  public async deleteAddress(id: string): Promise<void> {
    return await apiClient.delete(`${this.endpoint}/${id}`);
  }

  /**
   * Set an address as default
   * @param id - Address ID
   * @param isDefault - Whether to set as default
   * @returns Promise with the updated address
   */
  public async setDefaultAddress(id: string, isDefault: boolean = true): Promise<Address> {
    return await apiClient.patch<Address>(`${this.endpoint}/${id}/default`, { isDefault });
  }
}

// Create and export a singleton instance
const addressBookService = new AddressBookService();
export default addressBookService; 