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

import type { Station } from "../types/types";
import axios from "axios";
import { API_URL } from "../config/api";

export const fetchStationsWithJobs = async (
  token: string
): Promise<Station[]> => {
  if (!token) {
    throw new Error("Authentication token is required");
  }

  const response = await axios.get(`${API_URL}/assets`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.data) throw new Error("Failed to fetch stations");
  const stations = response.data;

  // Fetch current jobs for each station
  const stationsWithJobs = await Promise.all(
    stations.map(async (station: Station) => {
      const jobsResponse = await axios.get(
        `${API_URL}/assets/${station.id}/current_jobs`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (jobsResponse.data) {
        return { ...station, current_jobs: jobsResponse.data };
      }
      return station;
    })
  );

  return stationsWithJobs;
};
