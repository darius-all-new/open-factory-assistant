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

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  useTheme,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import EngineeringIcon from "@mui/icons-material/Engineering";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { fetchStationsWithJobs } from "../services/stationTracker";
import type { Station, Job } from "../types/types";
import { getCurrentTime } from "../utils/time";

interface ChartData {
  name: string;
  jobs: number;
  station: Station;
}

const isJobOverdue = (job: Job) => {
  if (!job.due_date) return false;
  const dueDate = new Date(job.due_date);
  return dueDate < getCurrentTime() && job.status.toLowerCase() !== "complete";
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const station: Station = payload[0].payload.station;
  const jobs = station.current_jobs || [];

  return (
    <Paper sx={{ p: 2, minWidth: 200, maxWidth: 300 }}>
      <Typography variant="subtitle1" color="primary" gutterBottom>
        {station.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {station.manufacturer} - {station.model}
      </Typography>
      <Typography variant="body2" gutterBottom>
        {jobs.length} Active Job{jobs.length !== 1 ? "s" : ""}
      </Typography>
      {jobs.length > 0 && (
        <List dense>
          {jobs.map((job) => (
            <ListItem key={job.id} sx={{ py: 0.5 }}>
              <ListItemText
                primary={job.name}
                secondary={`Due: ${job.due_date || "Not set"}`}
                sx={{
                  "& .MuiListItemText-primary": {
                    color: isJobOverdue(job) ? "error.main" : "inherit",
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default function StationTracker() {
  const theme = useTheme();
  const { token } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxJobs, setMaxJobs] = useState<number>(10); // Start with reasonable default
  const [showOnlyWithJobs, setShowOnlyWithJobs] = useState(false);

  const fetchStations = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!token) {
        setError("Authentication required");
        return;
      }
      const stationsWithJobs = await fetchStationsWithJobs(token);
      setStations(stationsWithJobs);
    } catch (error) {
      console.error("Error fetching stations:", error);
      setError("Failed to load station data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(fetchStations, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // Sort stations to maintain consistent order
  const sortedStations = [...stations]
    .filter((station: Station) => !showOnlyWithJobs || (station.current_jobs && station.current_jobs.length > 0))
    .sort((a: Station, b: Station) => {
      const aIndex = stations.findIndex(
        (station: Station) => station.name === a.name
      );
      const bIndex = stations.findIndex(
        (station: Station) => station.name === b.name
      );
      return aIndex - bIndex;
    });

  // Calculate new max jobs if needed
  const currentMaxJobs = Math.max(
    ...sortedStations.map(
      (station: Station) => station.current_jobs?.length || 0
    ),
    5 // Keep minimum scale of 5 for better visuals
  );

  // Only update maxJobs if the new max is significantly different
  useEffect(() => {
    if (currentMaxJobs > maxJobs + 2) {
      setMaxJobs(currentMaxJobs);
    }
  }, [currentMaxJobs, maxJobs]);

  // Update chart data while maintaining previous data for smooth transitions
  const chartData: ChartData[] = sortedStations.map((station: Station) => {
    return {
      name: station.name,
      jobs: station.current_jobs?.length || 0,
      station: station,
    };
  });

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.background.default,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: theme.palette.primary.main }}
        >
          Station Tracker
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant={showOnlyWithJobs ? "contained" : "outlined"}
          onClick={() => setShowOnlyWithJobs(!showOnlyWithJobs)}
          startIcon={<EngineeringIcon />}
          sx={{
            borderColor: showOnlyWithJobs ? "primary.main" : "divider",
            minWidth: 140,
          }}
        >
          {showOnlyWithJobs ? "Show All" : "Active Only"}
        </Button>
      </Box>

      <Paper
        sx={{
          p: 3,
          height: "calc(100vh - 200px)",
          minHeight: "400px",
          bgcolor: theme.palette.background.paper,
          borderRadius: 2,
          boxShadow: theme.shadows[2],
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.palette.divider}
            />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={70}
              interval={0}
              tick={{ fill: theme.palette.text.primary }}
              stroke={theme.palette.text.primary}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, Math.max(maxJobs, 1)]}
              label={{
                value: "Number of Jobs",
                angle: -90,
                position: "insideLeft",
                style: { fill: theme.palette.text.primary },
              }}
              tick={{ fill: theme.palette.text.primary }}
              stroke={theme.palette.text.primary}
            />
            <RechartsTooltip
              content={<CustomTooltip />}
              cursor={{
                fill: theme.palette.action.hover,
                opacity: 0.3,
              }}
            />
            <Bar
              dataKey="jobs"
              fill={theme.palette.primary.main}
              radius={[4, 4, 0, 0]}
              maxBarSize={80}
              animationDuration={500}
              animationBegin={0}
              isAnimationActive={true}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Sorted Stations Table */}
      <Paper
        sx={{
          mt: 3,
          p: 3,
          bgcolor: theme.palette.background.paper,
          borderRadius: 2,
          boxShadow: theme.shadows[2],
          overflow: "auto",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            fontWeight: "bold",
            color: theme.palette.primary.main,
          }}
        >
          Stations by Job Count
        </Typography>
        <Box sx={{ overflow: "auto" }}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Station Name</TableCell>
                <TableCell>Manufacturer</TableCell>
                <TableCell>Model</TableCell>
                <TableCell align="right">Active Jobs</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...stations]
                .filter((station: Station) => !showOnlyWithJobs || (station.current_jobs && station.current_jobs.length > 0))
                .sort(
                  (a: Station, b: Station) =>
                    (b.current_jobs?.length || 0) -
                    (a.current_jobs?.length || 0)
                )
                .map((station: Station) => (
                  <TableRow key={station.id}>
                    <TableCell component="th" scope="row">
                      <Typography variant="body1" color="primary">
                        {station.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{station.manufacturer}</TableCell>
                    <TableCell>{station.model}</TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          justifyContent: "flex-end",
                          alignItems: "center",
                        }}
                      >
                        <Chip
                          label={station.current_jobs?.length || 0}
                          color={
                            station.current_jobs?.length ? "primary" : "default"
                          }
                          size="small"
                        />
                        {station.current_jobs &&
                          station.current_jobs.filter(isJobOverdue).length >
                            0 && (
                            <Chip
                              label={`${
                                station.current_jobs.filter(isJobOverdue).length
                              } overdue`}
                              color="error"
                              size="small"
                              variant="outlined"
                            />
                          )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
}
