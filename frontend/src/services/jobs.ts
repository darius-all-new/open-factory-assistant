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
import { API_URL } from "../config/api";

export interface Asset {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
  description?: string;
}

export interface JobLocation {
  id: number;
  job_id: number;
  asset_id: number;
  asset: Asset;
  arrival_time: string;
  departure_time: string | null;
}

export interface JobWithHistory {
  locations?: JobLocation[];
}

export interface Job extends JobWithHistory {
  id: number;
  name: string;
  description?: string;
  status: "pending" | "in_progress" | "complete";
  customer: {
    id: number;
    name: string;
  };
  date_created: string;
  due_date?: string;
  current_location?: JobLocation;
}

export interface NewJobData {
  name: string;
  description?: string;
  customer_id: number;
  due_date?: string;
}

export const getAsset = async (
  assetId: number,
  token: string
): Promise<Asset | null> => {
  try {
    const response = await axios.get(`${API_URL}/assets/${assetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching asset ${assetId}:`, error);
    return null;
  }
};

export const getAssets = async (token: string): Promise<Asset[]> => {
  try {
    const response = await axios.get(`${API_URL}/assets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching assets:", error);
    return [];
  }
};

export const getJobHistory = async (
  jobId: number,
  token: string
): Promise<JobLocation[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/jobs/${jobId}/location_history`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const locations = response.data;
    const locationsWithAssets = await Promise.all(
      locations.map(async (location: JobLocation) => {
        const asset = await getAsset(location.asset_id, token);
        return asset ? { ...location, asset } : location;
      })
    );

    return locationsWithAssets;
  } catch (error) {
    console.error(`Error fetching history for job ${jobId}:`, error);
    return [];
  }
};

export const getCurrentLocation = async (
  jobId: number,
  token: string
): Promise<JobLocation | null> => {
  try {
    const locations = await getJobHistory(jobId, token);
    if (locations.length > 0) {
      const latestLocation = locations[locations.length - 1];
      if (!latestLocation.departure_time) {
        const asset = await getAsset(latestLocation.asset_id, token);
        return asset ? { ...latestLocation, asset } : null;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching locations for job ${jobId}:`, error);
    return null;
  }
};

export const getJobs = async (token: string): Promise<Job[]> => {
  try {
    const response = await axios.get(`${API_URL}/jobs`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const jobs = response.data;
    const jobsWithLocations = await Promise.all(
      jobs.map(async (job: Job) => {
        const currentLocation = await getCurrentLocation(job.id, token);
        return { ...job, current_location: currentLocation };
      })
    );

    return jobsWithLocations;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return [];
  }
};

export const createJob = async (
  jobData: NewJobData,
  token: string
): Promise<Job | null> => {
  try {
    const response = await axios.post(`${API_URL}/jobs`, jobData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating job:", error);
    return null;
  }
};

export const moveJob = async (
  jobId: number,
  stationId: number,
  token: string
): Promise<boolean> => {
  try {
    await axios.post(
      `${API_URL}/jobs/${jobId}/move`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { asset_id: stationId },
      }
    );
    return true;
  } catch (error) {
    console.error("Error moving job:", error);
    return false;
  }
};

export const completeJob = async (
  jobId: number,
  token: string
): Promise<boolean> => {
  try {
    await axios.post(
      `${API_URL}/jobs/${jobId}/status`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: "complete" },
      }
    );
    return true;
  } catch (error) {
    console.error("Error completing job:", error);
    return false;
  }
};

export const updateJobStatus = async (
  jobId: number,
  status: "pending" | "in_progress" | "complete",
  token: string
): Promise<boolean> => {
  try {
    await axios.post(
      `${API_URL}/jobs/${jobId}/status`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { status },
      }
    );
    return true;
  } catch (error) {
    console.error("Error updating job status:", error);
    return false;
  }
};
