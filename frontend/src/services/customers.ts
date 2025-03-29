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

import { z } from "zod";
import { apiClient } from "../api/client";

export enum JobStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "complete",
  CANCELLED = "cancelled",
}

const JobSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  status: z.nativeEnum(JobStatus),
  customer_id: z.number(),
  date_created: z.string(),
  due_date: z.string().nullable(),
});

export type Job = z.infer<typeof JobSchema>;

const CustomerSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  address: z.string().min(1).max(200),
  date_created: z.string(),
});

export type Customer = z.infer<typeof CustomerSchema>;

const CustomerCreateSchema = CustomerSchema.omit({
  id: true,
  date_created: true,
});

export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;

export const getCustomers = async (): Promise<Customer[]> => {
  const response = await apiClient.get<Customer[]>("/customers/");
  return z.array(CustomerSchema).parse(response);
};

export const createCustomer = async (
  customer: CustomerCreate
): Promise<Customer> => {
  const validatedData = CustomerCreateSchema.parse(customer);
  const response = await apiClient.post<Customer>("/customers/", validatedData);
  return CustomerSchema.parse(response);
};

export const updateCustomer = async (
  id: number,
  customer: CustomerCreate
): Promise<Customer> => {
  const validatedData = CustomerCreateSchema.parse(customer);
  const response = await apiClient.put<Customer>(
    `/customers/${id}`,
    validatedData
  );
  return CustomerSchema.parse(response);
};

export const deleteCustomer = async (id: number): Promise<void> => {
  await apiClient.delete(`/customers/${id}`);
};

export const getCustomerJobs = async (customerId: number): Promise<Job[]> => {
  const allJobs = await apiClient.get<Job[]>("/jobs/");
  const customerJobs = allJobs.filter((job) => job.customer_id === customerId);
  return z.array(JobSchema).parse(customerJobs);
};
