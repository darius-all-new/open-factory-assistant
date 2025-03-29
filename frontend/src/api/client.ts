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

import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from '../config/api';
import { getAuthToken, signOut } from './auth';
import { logger } from '../services/logger';

// Ensure HTTPS in production
if (process.env.NODE_ENV === 'production' && !API_URL.startsWith('https://')) {
  throw new Error('API_URL must use HTTPS in production');
}

class ApiClient {
  private static instance: ApiClient;
  private client: AxiosInstance;

  private constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log the request
        logger.info('API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers,
          data: config.data,
        });
        
        return config;
      },
      (error: AxiosError) => {
        logger.error('Request interceptor error', {
          message: error.message,
          config: error.config,
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log successful response
        logger.info('API Response', {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error: AxiosError) => {
        // Log error response
        logger.error('API Error', {
          message: error.message,
          status: error.response?.status,
          url: error.config?.url,
          data: error.response?.data,
        });

        if (error.response?.status === 401) {
          logger.warn('Authentication failed, signing out user');
          signOut();
          window.location.href = '/signin';
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): Error {
    if (error.response?.status === 429) {
      return new Error('Too many requests. Please try again later.');
    }
    
    // Don't expose internal error details to users
    return new Error('An unexpected error occurred. Please try again.');
  }

  public async get<T>(url: string) {
    const response = await this.client.get<T>(url);
    return response.data;
  }

  public async post<T>(url: string, data: unknown) {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  public async put<T>(url: string, data: unknown) {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  public async delete(url: string) {
    await this.client.delete(url);
  }
}

export const apiClient = ApiClient.getInstance();
