import { apiClient } from '../services/api';
import type { SenderProfile } from '../types/api.types';

const SENDER_PROFILES_URL = '/api/sender-profiles';

/**
 * Get all sender profiles for the current user
 * @returns Promise that resolves to an array of sender profiles
 */
export const getAllSenderProfiles = async (): Promise<SenderProfile[]> => {
  try {
    const apiResponse = await apiClient.get(SENDER_PROFILES_URL);
    
    if (apiResponse && apiResponse.status === 'success' && Array.isArray(apiResponse.data)) {
      return apiResponse.data;
    } else {
      console.error('Unexpected API response format:', apiResponse);
      return [];
    }
  } catch (error) {
    console.error('Error fetching sender profiles:', error);
    return [];
  }
};

/**
 * Get a specific sender profile by ID
 * @param id The ID of the sender profile
 * @returns Promise that resolves to the sender profile
 */
export const getSenderProfile = async (id: string): Promise<SenderProfile> => {
  try {
    const response = await apiClient.get(`${SENDER_PROFILES_URL}/${id}`);
    
    if (response?.status === 'success' && response?.data) {
      return response.data;
    } else {
      console.error('Unexpected API response format:', response);
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error(`Error fetching sender profile with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Get the default sender profile for the current user
 * @returns Promise that resolves to the default sender profile
 */
export const getDefaultSenderProfile = async (): Promise<SenderProfile> => {
  try {
    const response = await apiClient.get(`${SENDER_PROFILES_URL}/default`);
    
    if (response?.status === 'success' && response?.data) {
      return response.data;
    } else {
      console.error('Unexpected API response format:', response);
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error('Error fetching default sender profile:', error);
    throw error;
  }
};

/**
 * Create a new sender profile
 * @param profile The profile data to create
 * @returns Promise that resolves to the created sender profile
 */
export const createSenderProfile = async (profile: Partial<SenderProfile>): Promise<SenderProfile | null> => {
  try {
    const apiResponse = await apiClient.post(SENDER_PROFILES_URL, profile);
    
    if (apiResponse && apiResponse.status === 'success' && apiResponse.data) {
      return apiResponse.data;
    } else {
      console.error('Unexpected API response format:', apiResponse);
      return null;
    }
  } catch (error) {
    console.error('Error creating sender profile:', error);
    throw error;
  }
};

/**
 * Update an existing sender profile
 * @param id The ID of the profile to update
 * @param profile The updated profile data
 * @returns Promise that resolves to the updated sender profile
 */
export const updateSenderProfile = async (id: string, profile: Partial<SenderProfile>): Promise<SenderProfile> => {
  try {
    const response = await apiClient.put(`${SENDER_PROFILES_URL}/${id}`, profile);
    
    if (response?.status === 'success' && response?.data) {
      return response.data;
    } else {
      console.error('Unexpected API response format:', response);
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error(`Error updating sender profile with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a sender profile
 * @param id The ID of the profile to delete
 * @returns Promise that resolves when the profile is deleted
 */
export const deleteSenderProfile = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`${SENDER_PROFILES_URL}/${id}`);
  } catch (error) {
    console.error(`Error deleting sender profile with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Set a sender profile as the default
 * @param id The ID of the profile to set as default
 * @returns Promise that resolves to the updated sender profile
 */
export const setDefaultSenderProfile = async (id: string): Promise<SenderProfile> => {
  try {
    const response = await apiClient.put(`${SENDER_PROFILES_URL}/${id}/set-default`);
    
    if (response?.status === 'success' && response?.data) {
      return response.data;
    } else {
      console.error('Unexpected API response format:', response);
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error(`Error setting default sender profile with ID ${id}:`, error);
    throw error;
  }
}; 