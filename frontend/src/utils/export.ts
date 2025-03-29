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

import { Job, JobLocation } from "../services/jobs";

interface JobExportData {
  id: number;
  name: string;
  description: string;
  status: string;
  customer_name: string;
  date_created: string;
  due_date: string;
  location_history: string;
}

export const convertJobsToCSV = (jobs: Job[]): string => {
  const headers = [
    "Job ID",
    "Name",
    "Description",
    "Status",
    "Customer",
    "Date Created",
    "Due Date",
    "Location History",
  ];

  const formatLocationHistory = (history: JobLocation[] = []): string => {
    return history
      .map(
        (loc) =>
          `${loc.asset.name} (${new Date(loc.arrival_time).toLocaleString()}${
            loc.departure_time
              ? ` - ${new Date(loc.departure_time).toLocaleString()}`
              : " - Present"
          })`
      )
      .join(" → ");
  };

  const rows: JobExportData[] = jobs.map((job) => ({
    id: job.id,
    name: job.name,
    description: job.description || "",
    status: job.status,
    customer_name: job.customer.name,
    date_created: job.date_created,
    due_date: job.due_date || "",
    location_history: formatLocationHistory(job.history),
  }));

  const escapeCsvValue = (value: string | number): string => {
    if (typeof value === "number") return value.toString();
    if (!value) return "";
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      Object.values(row)
        .map((value) => escapeCsvValue(value))
        .join(",")
    ),
  ].join("\n");

  return csvContent;
};

export const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
