/*
OpenFactoryAssistant

This file is part of OpenFactoryAssistant.

OpenFactoryAssistant is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

OpenFactoryAssistant is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with OpenFactoryAssistant. If not, see <https://www.gnu.org/licenses/>
*/

import { API_URL } from "../config/api";
import axios from 'axios';
import { z } from 'zod';
import { logger } from '../services/logger';

const SignInCredentialsSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
});

export type SignInCredentials = z.infer<typeof SignInCredentialsSchema>;

interface SignInResponse {
  access_token: string;
}

export const signIn = async (credentials: SignInCredentials): Promise<SignInResponse> => {
  try {
    // Validate input
    SignInCredentialsSchema.parse(credentials);
    logger.info('Attempting sign in', { username: credentials.username });

    const formData = new URLSearchParams({
      username: credentials.username,
      password: credentials.password,
    });

    const response = await axios.post(`${API_URL}/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data.access_token) {
      sessionStorage.setItem('token', response.data.access_token);
      logger.info('Sign in successful', { username: credentials.username });
      return response.data;
    }
    
    logger.error('Sign in failed - no token in response', { username: credentials.username });
    throw new Error('No token received');
  } catch (error) {
    logger.error('Sign in error', {
      username: credentials.username,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export const signOut = () => {
  logger.info('User signing out');
  sessionStorage.removeItem('token');
  // Only redirect if we're not already on the signin page
  if (!window.location.pathname.includes('/signin')) {
    window.location.replace('/signin');
  }
};

export const getAuthToken = (): string | null => {
  return sessionStorage.getItem('token');
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const isExpired = currentTime >= expirationTime;
    
    if (isExpired) {
      logger.warn('Token expired', { 
        expirationTime: new Date(expirationTime).toISOString(),
        currentTime: new Date(currentTime).toISOString()
      });
    }
    
    return isExpired;
  } catch (error) {
    logger.error('Error checking token expiration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return true;
  }
};

export const validateCurrentToken = (): boolean => {
  const token = getAuthToken();
  if (!token) {
    logger.debug('No token found in storage');
    return false;
  }
  const valid = !isTokenExpired(token);
  logger.debug('Token validation result', { valid });
  return valid;
};
