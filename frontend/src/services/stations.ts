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
import type { Station, Job, NewStationData } from "../types/types";
import { getAuthToken } from '../api/auth';

export interface StationPosition {
  x: number;
  y: number;
}

const getStations = async (): Promise<Station[]> => {
  const token = getAuthToken();
  const response = await axios.get(`${API_URL}/assets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getStationCurrentJobs = async (stationId: number): Promise<Job[]> => {
  const token = getAuthToken();
  const response = await axios.get(
    `${API_URL}/assets/${stationId}/current_jobs`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

const createStation = async (station: NewStationData): Promise<Station> => {
  const token = getAuthToken();
  const response = await axios.post(`${API_URL}/assets`, station, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

const updateStationPosition = async (
  stationId: number,
  position: StationPosition
): Promise<Station> => {
  const token = getAuthToken();
  const response = await axios.patch(
    `${API_URL}/assets/${stationId}/position`,
    { position },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export { getStations, getStationCurrentJobs, createStation, updateStationPosition };
