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

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Checkbox,
  Stack,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  TextField,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  AlignHorizontalLeft as TimelineIcon,
  ClearAll as ClearAllIcon,
  Today as TodayIcon,
  Search as SearchIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from "@mui/icons-material";
import { useTheme, alpha } from "@mui/material/styles";
import {
  format,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  subWeeks,
  formatDistanceStrict,
} from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { api } from "../services/api";

interface Job {
  id: number;
  name: string;
  due_date?: string;
  status: string;
}

interface Asset {
  id: number;
  name: string;
}

interface JobLocation {
  id: number;
  job_id: number;
  asset_id: number;
  asset: Asset;
  arrival_time: string;
  departure_time: string | null;
}

interface TimelineJob {
  job: Job;
  locations: JobLocation[];
}

const TimelineView: React.FC = () => {
  const theme = useTheme();
  const REFRESH_INTERVAL = 30000; // Refresh every 30 seconds
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Generate date ticks for the timeline
  const getDateTicks = () => {
    return eachDayOfInterval({
      start: startOfDay(startDate),
      end: endOfDay(endDate),
    });
  };

  // State management
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<number[]>(() => {
    const savedSelection = localStorage.getItem("timelineSelectedJobs");
    return savedSelection ? JSON.parse(savedSelection) : [];
  });
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineJob[]>([]);
  const [startDate, setStartDate] = useState<Date>(() => {
    const savedRange = localStorage.getItem("timelineViewDateRange");
    if (savedRange) {
      const { start } = JSON.parse(savedRange);
      return new Date(start);
    }
    return subWeeks(new Date(), 2);
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const savedRange = localStorage.getItem("timelineViewDateRange");
    if (savedRange) {
      const { end } = JSON.parse(savedRange);
      return new Date(end);
    }
    return new Date();
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<
    "week" | "2weeks" | "month" | null
  >(null);

  // Function to check if a job is overdue
  const isJobOverdue = (job: Job): boolean => {
    if (!job.due_date || job.status === "complete") return false;
    return new Date(job.due_date) < new Date();
  };

  // Helper function to get job statuses (can have multiple)
  const getJobStatuses = (job: Job): string[] => {
    const statuses: string[] = [job.status];
    if (isJobOverdue(job)) {
      statuses.push("overdue");
    }
    return statuses;
  };

  // Helper function to get filter counts (count jobs that have this status)
  const getFilterCount = (status: string) => {
    return jobs.filter((job) => getJobStatuses(job).includes(status)).length;
  };

  // Filter jobs based on search term and status filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        searchTerm === "" ||
        job.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        selectedFilters.length === 0 ||
        selectedFilters.some((filter) => getJobStatuses(job).includes(filter));
      return matchesSearch && matchesFilter;
    });
  }, [jobs, searchTerm, selectedFilters]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setOpen(false);
  };

  // Handle date preset selection
  const handleDatePreset = (preset: "week" | "2weeks" | "month") => {
    const end = new Date();
    const endOfToday = endOfDay(end);
    let start: Date;

    switch (preset) {
      case "week":
        start = startOfDay(subWeeks(end, 1));
        break;
      case "2weeks":
        start = startOfDay(subWeeks(end, 2));
        break;
      case "month":
        start = startOfDay(subWeeks(end, 4));
        break;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(endOfToday);
    setSelectedPreset(preset);
  };

  // Filter section component
  const FilterSection = () => {
    return (
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ mr: 1, color: "action.active" }} />
            ),
          }}
          sx={{ mb: 2 }}
        />
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const newFilters = selectedFilters.includes("in_progress")
                ? selectedFilters.filter((f) => f !== "in_progress")
                : [...selectedFilters, "in_progress"];
              setSelectedFilters(newFilters);
            }}
            sx={{
              flex: "1 1 calc(33% - 8px)",
              minWidth: 0,
              textTransform: "none",
              py: 0.5,
              border: "1px solid",
              borderColor: selectedFilters.includes("in_progress")
                ? "primary.main"
                : "divider",
              borderRadius: "4px !important",
              color: selectedFilters.includes("in_progress")
                ? "primary.main"
                : "text.primary",
              bgcolor: selectedFilters.includes("in_progress")
                ? (theme) => alpha(theme.palette.primary.main, 0.1)
                : "transparent",
              "&:hover": {
                bgcolor: selectedFilters.includes("in_progress")
                  ? (theme) => alpha(theme.palette.primary.main, 0.2)
                  : "action.hover",
              },
            }}
          >
            In Progress ({getFilterCount("in_progress")})
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const newFilters = selectedFilters.includes("complete")
                ? selectedFilters.filter((f) => f !== "complete")
                : [...selectedFilters, "complete"];
              setSelectedFilters(newFilters);
            }}
            sx={{
              flex: "1 1 calc(33% - 8px)",
              minWidth: 0,
              textTransform: "none",
              py: 0.5,
              border: "1px solid",
              borderColor: selectedFilters.includes("complete")
                ? "primary.main"
                : "divider",
              borderRadius: "4px !important",
              color: selectedFilters.includes("complete")
                ? "primary.main"
                : "text.primary",
              bgcolor: selectedFilters.includes("complete")
                ? (theme) => alpha(theme.palette.primary.main, 0.1)
                : "transparent",
              "&:hover": {
                bgcolor: selectedFilters.includes("complete")
                  ? (theme) => alpha(theme.palette.primary.main, 0.2)
                  : "action.hover",
              },
            }}
          >
            Complete ({getFilterCount("complete")})
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const newFilters = selectedFilters.includes("overdue")
                ? selectedFilters.filter((f) => f !== "overdue")
                : [...selectedFilters, "overdue"];
              setSelectedFilters(newFilters);
            }}
            sx={{
              flex: "1 1 calc(33% - 8px)",
              minWidth: 0,
              textTransform: "none",
              py: 0.5,
              border: "1px solid",
              borderColor: selectedFilters.includes("overdue")
                ? "primary.main"
                : "divider",
              borderRadius: "4px !important",
              color: selectedFilters.includes("overdue")
                ? "primary.main"
                : "text.primary",
              bgcolor: selectedFilters.includes("overdue")
                ? (theme) => alpha(theme.palette.primary.main, 0.1)
                : "transparent",
              "&:hover": {
                bgcolor: selectedFilters.includes("overdue")
                  ? (theme) => alpha(theme.palette.primary.main, 0.2)
                  : "action.hover",
              },
            }}
          >
            Overdue ({getFilterCount("overdue")})
          </Button>
        </Box>
      </Box>
    );
  };

  // Fetch all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await api.get("/jobs");
        setJobs(response.data);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setError("Failed to load jobs. Please try again later.");
      } finally {
        setInitialLoading(false); // Set initialLoading to false after jobs are loaded
      }
    };
    fetchJobs();
  }, []);

  // Save selection to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("timelineSelectedJobs", JSON.stringify(selectedJobs));
  }, [selectedJobs]);

  // Save date range to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "timelineViewDateRange",
      JSON.stringify({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      })
    );
  }, [startDate, endDate]);

  // Fetch location history for selected jobs and refresh periodically
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchLocationHistory = async (isInitialLoad: boolean = false) => {
      if (selectedJobs.length > 0) {
        if (isInitialLoad) {
          setLoading(true);
        }
        setError(null);
      }

      try {
        const jobData = await Promise.all(
          selectedJobs.map(async (jobId) => {
            try {
              // First get the job details
              const jobResponse = await api.get(`/jobs/${jobId}`);
              const job = jobResponse.data;

              // Then get the location history with asset details
              const locationsResponse = await api.get(
                `/jobs/${jobId}/location_history`
              );
              const locations = locationsResponse.data;

              // For each location, fetch the asset details
              const locationsWithAssets = await Promise.all(
                locations.map(async (location: JobLocation) => {
                  const assetResponse = await api.get(
                    `/assets/${location.asset_id}`
                  );
                  return {
                    ...location,
                    asset: assetResponse.data,
                  };
                })
              );

              return {
                job,
                locations: locationsWithAssets,
              };
            } catch (error) {
              console.error(`Error fetching data for job ${jobId}:`, error);
              return null;
            }
          })
        );

        const filteredData = jobData.filter(
          (data): data is TimelineJob => data !== null
        );
        setTimelineData(filteredData);

        if (selectedJobs.length > 0 && filteredData.length === 0) {
          setError("No timeline data available for selected jobs.");
        }
      } catch (error) {
        console.error("Error fetching timeline data:", error);
        setError("Failed to load timeline data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    const fetchAndSetupInterval = () => {
      if (selectedJobs.length > 0) {
        fetchLocationHistory(true);
        // Set up periodic refresh
        intervalId = setInterval(
          () => fetchLocationHistory(false),
          REFRESH_INTERVAL
        );
      } else {
        setTimelineData([]);
        setError(null);
      }
    };

    fetchAndSetupInterval();

    // Cleanup interval on unmount or when selected jobs change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedJobs]);

  const handleJobToggle = (jobId: number, forceSelect: boolean = false) => {
    setSelectedJobs((prev) => {
      if (forceSelect) {
        return prev.includes(jobId) ? prev : [...prev, jobId];
      }
      return prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId];
    });
  };

  const handleDeselectAll = () => {
    setSelectedJobs([]);
  };

  const getBlockColor = (_start: Date, _end: Date, assetId: number) => {
    // Create a fixed set of distinct colors for different assets
    const assetColors = [
      "#2196F3", // Blue
      "#4CAF50", // Green
      "#FFC107", // Amber
      "#9C27B0", // Purple
      "#F44336", // Red
      "#00BCD4", // Cyan
      "#FF9800", // Orange
      "#795548", // Brown
      "#607D8B", // Blue Grey
      "#E91E63", // Pink
    ];

    // Use modulo to ensure we always have a valid color index
    const colorIndex = (assetId - 1) % assetColors.length;
    return assetColors[colorIndex];
  };

  // Parse timestamps with proper timezone handling
  const parseTimestamp = (timestamp: string | null): Date => {
    if (!timestamp) return new Date();
    // Ensure the timestamp is treated as UTC
    return new Date(timestamp + "Z");
  };

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: theme.palette.primary.main }}
          >
            Timeline View
          </Typography>
          <Chip
            icon={<TodayIcon />}
            label={`${format(startDate, "dd/MM/yyyy")} - ${format(
              endDate,
              "dd/MM/yyyy"
            )}`}
            color="primary"
            variant="outlined"
            sx={{ height: 32 }}
          />
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Typography>Set a date range:</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <DatePicker
                selected={startDate}
                onChange={(date) => {
                  if (date) {
                    setStartDate(startOfDay(date));
                    setSelectedPreset(null);
                  }
                }}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={endDate}
                dateFormat="dd/MM/yyyy"
                customInput={
                  <TextField
                    size="small"
                    label="Start Date"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <TodayIcon sx={{ mr: 1, color: "action.active" }} />
                        </Box>
                      ),
                    }}
                  />
                }
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => {
                  if (date) {
                    setEndDate(endOfDay(date));
                    setSelectedPreset(null);
                  }
                }}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                maxDate={endOfDay(new Date())}
                dateFormat="dd/MM/yyyy"
                customInput={
                  <TextField
                    size="small"
                    label="End Date"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <TodayIcon sx={{ mr: 1, color: "action.active" }} />
                        </Box>
                      ),
                    }}
                  />
                }
              />
              <Box>
                <Button
                  id="date-preset-button"
                  aria-controls={open ? "date-preset-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? "true" : undefined}
                  onClick={handleClick}
                  endIcon={<ArrowDropDownIcon />}
                  size="small"
                  variant="outlined"
                >
                  {selectedPreset
                    ? selectedPreset === "week"
                      ? "Last Week"
                      : selectedPreset === "2weeks"
                      ? "Last 2 Weeks"
                      : "Last Month"
                    : "Quick Select"}
                </Button>
                <Menu
                  id="date-preset-menu"
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleClose}
                  MenuListProps={{
                    "aria-labelledby": "date-preset-button",
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      handleDatePreset("week");
                      handleClose();
                    }}
                    selected={selectedPreset === "week"}
                  >
                    Last Week
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleDatePreset("2weeks");
                      handleClose();
                    }}
                    selected={selectedPreset === "2weeks"}
                  >
                    Last 2 Weeks
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleDatePreset("month");
                      handleClose();
                    }}
                    selected={selectedPreset === "month"}
                  >
                    Last Month
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          </div>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && !timelineData.length && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          height: "calc(100% - 64px)",
        }}
      >
        <Box
          sx={{
            width: "300px",
            mr: 2,
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
            borderRadius: 1,
            boxShadow: 1,
            overflow: "hidden",
          }}
        >
          <FilterSection />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" sx={{ pl: 1 }}>
              Jobs ({filteredJobs.length})
            </Typography>
            <IconButton
              size="small"
              onClick={handleDeselectAll}
              disabled={selectedJobs.length === 0}
              title="Clear selection"
            >
              <ClearAllIcon fontSize="small" />
            </IconButton>
          </Box>
          {initialLoading ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List
              sx={{
                overflowY: "auto",
                flex: 1,
                "& .MuiListItem-root": {
                  borderLeft: "4px solid transparent",
                  "&.overdue": {
                    borderLeft: `4px solid ${theme.palette.error.main}`,
                    bgcolor: alpha(theme.palette.error.main, 0.05),
                  },
                },
              }}
            >
              {filteredJobs.map((job) => (
                <ListItem
                  key={job.id}
                  className={isJobOverdue(job) ? "overdue" : ""}
                  sx={{
                    cursor: "pointer",
                    bgcolor: selectedJobs.includes(job.id)
                      ? alpha(theme.palette.primary.main, 0.1)
                      : "transparent",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                    pl: 1, // Reduce left padding to accommodate checkbox
                  }}
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={selectedJobs.includes(job.id)}
                      onChange={() => handleJobToggle(job.id)}
                      onClick={(e) => e.stopPropagation()} // Prevent ListItem click when clicking checkbox
                    />
                  }
                  onClick={() => handleJobToggle(job.id)}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: selectedJobs.includes(job.id) ? 500 : 400,
                          color: selectedJobs.includes(job.id)
                            ? theme.palette.primary.main
                            : "text.primary",
                        }}
                      >
                        {job.name}
                      </Typography>
                    }
                    secondaryTypographyProps={{ component: "div" }}
                    secondary={
                      <>
                        <Typography
                          variant="caption"
                          color={
                            job.status === "complete" ? "success" : "primary"
                          }
                        >
                          {job.status}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            position: "relative",
            opacity: initialLoading ? 0.5 : 1,
            pointerEvents: initialLoading ? "none" : "auto",
            transition: "opacity 0.2s ease-in-out",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Card
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflowX: "auto",
              boxShadow: theme.shadows[2],
              "&:hover": {
                boxShadow: theme.shadows[4],
              },
              transition: theme.transitions.create(["box-shadow"], {
                duration: theme.transitions.duration.short,
              }),
            }}
          >
            <CardContent
              sx={{
                p: 2,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0, // This is crucial for flex child to respect parent height
              }}
            >
              {selectedJobs.length === 0 ? (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 4,
                    color: "text.secondary",
                  }}
                >
                  <TimelineIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" gutterBottom>
                    No Jobs Selected
                  </Typography>
                  <Typography
                    variant="body2"
                    align="center"
                    sx={{ maxWidth: 400 }}
                  >
                    Select one or more jobs from the list to view their
                    timelines.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  {/* Timeline header with dates */}
                  <Box
                    sx={{
                      position: "relative",
                      height: 30,
                      mb: 2,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {/* Date ticks */}
                    {getDateTicks().map((date) => (
                      <Box
                        key={date.getTime()}
                        sx={{
                          position: "absolute",
                          left: `${
                            ((date.getTime() - startDate.getTime()) /
                              (endDate.getTime() - startDate.getTime())) *
                            100
                          }%`,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          transform: "translateX(-50%)",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            color: theme.palette.text.secondary,
                            whiteSpace: "nowrap",
                            mb: 1,
                          }}
                        >
                          {format(date, "d MMM")}
                        </Typography>
                        {/* Tick mark */}
                        <div
                          style={{
                            width: "1px",
                            height: "8px",
                            backgroundColor: theme.palette.divider,
                          }}
                        />
                      </Box>
                    ))}
                  </Box>

                  {/* Job rows */}
                  {timelineData.map((jobData) => (
                    <Box
                      key={jobData.job.id}
                      sx={{
                        position: "relative",
                        mb: 3,
                      }}
                    >
                      {/* Job header with details */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            mb: 0.5,
                            fontWeight: "medium",
                            color: theme.palette.text.primary,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          {jobData.job.name}
                          <Stack direction="row" spacing={1}>
                            <Chip
                              size="small"
                              label={`${jobData.locations.length} locations`}
                              sx={{
                                height: 20,
                                fontSize: "0.75rem",
                                bgcolor: theme.palette.primary.main + "1A",
                                color: theme.palette.primary.main,
                              }}
                            />
                            {isJobOverdue(jobData.job) && (
                              <Chip
                                size="small"
                                label="Overdue"
                                sx={{
                                  height: 20,
                                  fontSize: "0.75rem",
                                  bgcolor: alpha(theme.palette.error.main, 0.1),
                                  color: theme.palette.error.main,
                                  borderColor: theme.palette.error.main,
                                  borderWidth: 1,
                                  borderStyle: "solid",
                                }}
                              />
                            )}
                          </Stack>
                        </Typography>
                        <Box
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor:
                                jobData.locations.length > 0
                                  ? jobData.locations[
                                      jobData.locations.length - 1
                                    ].departure_time
                                    ? theme.palette.success.main
                                    : theme.palette.warning.main
                                  : theme.palette.error.main,
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {jobData.locations.length > 0
                              ? jobData.locations[jobData.locations.length - 1]
                                  .departure_time
                                ? "Completed"
                                : "In Progress"
                              : "No Activity"}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Timeline row */}
                      <Box
                        sx={{
                          position: "relative",
                          height: 30,
                          mb: 1,
                          backgroundColor: alpha(
                            theme.palette.background.paper,
                            0.8
                          ),
                          borderRadius: 1,
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "transparent",
                            zIndex: 0,
                          },
                        }}
                      >
                        {/* Location blocks */}
                        {jobData.locations
                          .filter((location) => {
                            const locationStart = parseTimestamp(
                              location.arrival_time
                            );
                            const locationEnd = location.departure_time
                              ? parseTimestamp(location.departure_time)
                              : new Date();
                            return (
                              locationStart <= endDate &&
                              locationEnd >= startDate
                            );
                          })
                          .map((location) => {
                            const start = parseTimestamp(location.arrival_time);
                            const end = location.departure_time
                              ? parseTimestamp(location.departure_time)
                              : new Date();

                            // Clamp start and end times to the visible time period
                            const visibleStart =
                              start < startDate ? startDate : start;
                            const visibleEnd = end > endDate ? endDate : end;

                            // Calculate position as percentage based on visible portion only
                            const timeRange =
                              endDate.getTime() - startDate.getTime();
                            const startPos = Math.max(
                              ((visibleStart.getTime() - startDate.getTime()) /
                                timeRange) *
                                100,
                              0
                            );
                            const endPos = Math.min(
                              ((visibleEnd.getTime() - startDate.getTime()) /
                                timeRange) *
                                100,
                              100
                            );
                            const width = Math.max(endPos - startPos, 0.5); // Ensure minimum width

                            return (
                              <Tooltip
                                key={location.id}
                                title={
                                  <Box sx={{ p: 1 }}>
                                    <Typography
                                      variant="subtitle2"
                                      sx={{ fontWeight: "bold", mb: 1 }}
                                    >
                                      {location.asset.name}
                                    </Typography>
                                    <Typography variant="body2">
                                      Arrived:{" "}
                                      {format(start, "dd/MM/yyyy HH:mm:ss")}
                                    </Typography>
                                    {location.departure_time && (
                                      <Typography variant="body2">
                                        Departed:{" "}
                                        {format(end, "dd/MM/yyyy HH:mm:ss")}
                                      </Typography>
                                    )}
                                    <Typography
                                      variant="body2"
                                      sx={{ mt: 1, fontStyle: "italic" }}
                                    >
                                      Duration:{" "}
                                      {formatDistanceStrict(start, end, {
                                        addSuffix: false,
                                      })}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Box
                                  sx={{
                                    position: "absolute",
                                    left: `${startPos}%`,
                                    width: `${width}%`,
                                    height: "100%",
                                    bgcolor: getBlockColor(
                                      start,
                                      end,
                                      location.asset_id
                                    ),
                                    borderRadius: 1,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease-in-out",
                                    display: "block",
                                    opacity: 1,
                                    minWidth: "2px",
                                    "&:hover": {
                                      filter: "brightness(1.1)",
                                      transform: "scaleY(1.1)",
                                      boxShadow: 1,
                                    },
                                  }}
                                  onClick={() =>
                                    handleJobToggle(jobData.job.id, true)
                                  }
                                />
                              </Tooltip>
                            );
                          })}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default TimelineView;
