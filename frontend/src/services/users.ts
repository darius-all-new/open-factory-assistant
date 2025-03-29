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
import { getAuthToken } from '../api/auth';

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  date_created: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
}

export const getUsers = async (): Promise<User[]> => {
  const token = getAuthToken();
  const response = await axios.get(`${API_URL}/users/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createUser = async (user: UserCreate): Promise<User> => {
  const token = getAuthToken();
  const response = await axios.post(`${API_URL}/users/register`, user, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
