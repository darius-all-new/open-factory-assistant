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

import axios from "axios";
import { getAuthToken, signOut, validateCurrentToken } from "../api/auth";
import { API_URL } from "../config/api";

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  // Check if token exists and is valid
  if (token) {
    if (!validateCurrentToken()) {
      // Token exists but is expired
      signOut();
      return Promise.reject(new Error("Token expired"));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.message === "Token expired") {
      signOut();
    }
    return Promise.reject(error);
  }
);

export { api };
