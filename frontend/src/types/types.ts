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

export interface Station {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
  description?: string;
  current_jobs?: Job[];
  date_created: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface Job {
  id: number;
  name: string;
  status: string;
  customer_id: number;
  description?: string;
  due_date?: string;
}

export interface NewStationData {
  name: string;
  manufacturer: string;
  model: string;
  description?: string;
}
