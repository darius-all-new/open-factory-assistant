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

import axios, { AxiosError } from "axios";
import { auth } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = auth.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors, including token expiration
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token is expired or invalid
      auth.logout();
      // Redirect to login if needed
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

interface QRCodeData {
  job: number;
}

interface Job {
  id: number;
  name: string;
  description: string;
  status: string;
}

interface Asset {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
  description: string;
}

export const getJob = async (jobId: number) => {
  const response = await api.get(`/jobs/${jobId}`);
  return response.data;
};

export const getAsset = async (assetId: number) => {
  const response = await api.get(`/assets/${assetId}`);
  return response.data;
};

export const getAllAssets = async () => {
  const response = await api.get("/assets");
  return response.data;
};

export const moveJobToStation = async (jobId: number, stationId: number) => {
  const response = await api.post(`/jobs/${jobId}/move`, null, {
    params: { asset_id: stationId },
  });
  return response.data;
};

export const completeJob = async (jobId: number) => {
  const response = await api.post(`/jobs/${jobId}/status`, null, {
    params: { status: "complete" },
  });
  return response.data;
};

// export const getJob = async (jobId: number): Promise<Job> => {
//   const response = await fetch(`${API_URL}/jobs/${jobId}`, {
//     headers,
//   });

//   if (!response.ok) {
//     throw new Error("Failed to fetch job details");
//   }

//   return response.json();
// };

// export const getAsset = async (assetId: number): Promise<Asset> => {
//   const response = await fetch(`${API_URL}/assets/${assetId}`, {
//     headers,
//   });

//   if (!response.ok) {
//     throw new Error("Failed to fetch asset details");
//   }

//   return response.json();
// };

// export const getAllAssets = async (): Promise<Asset[]> => {
//   const response = await fetch(`${API_URL}/assets`, {
//     headers,
//   });

//   if (!response.ok) {
//     throw new Error("Failed to fetch assets");
//   }

//   return response.json();
// };

// export const moveJobToStation = async (
//   jobId: number,
//   stationId: number
// ): Promise<Response> => {
//   const response = await fetch(
//     `${API_URL}/jobs/${jobId}/move?asset_id=${stationId}`,
//     {
//       method: "POST",
//       headers,
//     }
//   );

//   if (!response.ok) {
//     throw new Error("Failed to move job to station");
//   }

//   return response;
// };
