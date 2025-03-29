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
  Typography,
  Paper,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useTheme,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Collapse,
  Menu,
  alpha,
} from "@mui/material";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useAuth } from "../contexts/AuthContext";
import {
  Job,
  JobLocation,
  NewJobData,
  Asset,
  getJobs,
  getJobHistory,
  createJob,
  moveJob,
  completeJob,
  getAssets,
  updateJobStatus,
} from "../services/jobs";
import { Customer, getCustomers } from "../services/customers";
import { getCurrentTime } from "../utils/time";
import { convertJobsToCSV, downloadCSV } from "../utils/export";

export default function Jobs() {
  const theme = useTheme();
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [jobHistories, setJobHistories] = useState<
    Record<number, JobLocation[]>
  >({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stations, setStations] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "complete" | "overdue"
  >("active");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number>(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [newJob, setNewJob] = useState<NewJobData>({
    name: "",
    description: "",
    customer_id: 0,
    due_date: "",
  });

  const fetchJobHistory = async (jobId: number) => {
    if (!token) return;
    const history = await getJobHistory(jobId, token);
    setJobHistories((prev) => ({ ...prev, [jobId]: history }));
  };

  const fetchJobs = async () => {
    if (!token) return;
    const fetchedJobs = await getJobs(token);
    setJobs(fetchedJobs);
  };

  const fetchStations = async () => {
    if (!token) return;
    const fetchedStations = await getAssets(token);
    setStations(fetchedStations);
  };

  const fetchCustomers = async () => {
    if (!token) return;
    const fetchedCustomers = await getCustomers();
    setCustomers(fetchedCustomers);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const fetchedJobs = await getJobs(token);
        setJobs(fetchedJobs);
        await fetchCustomers();
        await fetchStations();
      } catch (err) {
        console.error("Error fetching jobs:", err);
      }
    };

    fetchData();
    const refreshInterval = setInterval(fetchData, 30000); // 30 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [token]);

  const handleCreateJob = async () => {
    if (!token) return;
    const createdJob = await createJob(newJob, token);
    if (createdJob) {
      setIsAddDialogOpen(false);
      fetchJobs();
      setNewJob({
        name: "",
        description: "",
        customer_id: 0,
        due_date: "",
      });
    }
  };

  const handleMoveJob = async () => {
    if (!token || !selectedJob) return;
    const success = await moveJob(selectedJob.id, selectedStationId, token);
    if (success) {
      setIsMoveDialogOpen(false);
      fetchJobs();
      if (expandedJob === selectedJob.id) {
        fetchJobHistory(selectedJob.id);
      }
    }
  };

  const handleCompleteJob = async (jobId: number) => {
    if (!token) return;
    const success = await completeJob(jobId, token);
    if (success) {
      setMenuAnchorEl(null);
      fetchJobs();
    }
  };

  const handleUpdateJobStatus = async (
    jobId: number,
    status: "pending" | "in_progress" | "complete"
  ) => {
    if (!token) return;
    const success = await updateJobStatus(jobId, status, token);
    if (success) {
      setMenuAnchorEl(null);
      setActiveJobId(null);
      fetchJobs();
    }
  };

  const handleJobExpand = async (jobId: number) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      await fetchJobHistory(jobId);
      setExpandedJob(jobId);
    }
  };

  const isJobOverdue = (job: Job) => {
    if (!job.due_date) return false;
    const dueDate = new Date(job.due_date);
    return dueDate < getCurrentTime() && job.status.toLowerCase() !== "complete";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return theme.palette.warning.main;
      case "in_progress":
        return theme.palette.info.main;
      case "complete":
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer.name.toLowerCase().includes(searchTerm.toLowerCase());

    const jobStatus = job.status.toLowerCase();
    const isOverdue = isJobOverdue(job);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && jobStatus !== "complete") ||
      (statusFilter === "complete" && jobStatus === "complete") ||
      (statusFilter === "overdue" && isOverdue);

    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = async () => {
    if (!token) return;
    
    // Make sure we have the full history for all jobs
    const jobsWithHistory = await Promise.all(
      jobs.map(async (job) => {
        if (!jobHistories[job.id]) {
          const history = await getJobHistory(job.id, token);
          setJobHistories((prev) => ({ ...prev, [job.id]: history }));
          return { ...job, history };
        }
        return { ...job, history: jobHistories[job.id] };
      })
    );

    const csvContent = convertJobsToCSV(jobsWithHistory);
    const timestamp = new Date().toISOString().split("T")[0] || "export";
    downloadCSV(csvContent, `jobs_export_${timestamp}.csv`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: theme.palette.primary.main }}
        >
          Jobs
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddDialogOpen(true)}
          >
            Add Job
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <SearchIcon sx={{ color: "action.active", mr: 1 }} />
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search jobs by name, description, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant={statusFilter === "all" ? "contained" : "outlined"}
              size="small"
              onClick={() => setStatusFilter("all")}
            >
              All Jobs
            </Button>
            <Button
              variant={statusFilter === "active" ? "contained" : "outlined"}
              size="small"
              onClick={() => setStatusFilter("active")}
            >
              Active Jobs
            </Button>
            <Button
              variant={statusFilter === "complete" ? "contained" : "outlined"}
              size="small"
              onClick={() => setStatusFilter("complete")}
            >
              Completed Jobs
            </Button>
            <Button
              variant={statusFilter === "overdue" ? "contained" : "outlined"}
              size="small"
              onClick={() => setStatusFilter("overdue")}
              sx={{
                color: statusFilter === "overdue" ? "white" : "error.main",
                borderColor: "error.main",
                bgcolor: statusFilter === "overdue" ? "error.main" : "transparent",
                "&:hover": {
                  bgcolor: statusFilter === "overdue" ? "error.dark" : "error.light",
                  borderColor: "error.main"
                }
              }}
            >
              Overdue Jobs
            </Button>
          </Box>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Job Details</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Status & Location</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredJobs.map((job) => (
              <React.Fragment key={job.id}>
                <TableRow
                  sx={{
                    "&:hover": {
                      bgcolor: theme.palette.action.hover,
                    },
                    "& > *": {
                      borderBottom:
                        expandedJob === job.id ? "unset" : "inherit",
                    },
                    ...(isJobOverdue(job) && {
                      bgcolor: alpha(theme.palette.error.light, 0.08),
                      "&:hover": {
                        bgcolor: alpha(theme.palette.error.light, 0.12),
                      },
                    }),
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => handleJobExpand(job.id)}
                      >
                        {expandedJob === job.id ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                      <Box>
                        <Typography variant="subtitle1" color="primary">
                          {job.name}
                        </Typography>
                        {job.description && (
                          <Typography variant="body2" color="text.secondary">
                            {job.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{job.customer.name}</Typography>
                  </TableCell>
                  <TableCell>
                    {job.due_date ? (
                      <Stack spacing={0.5}>
                        <Typography variant="body2">
                          {new Date(job.due_date).toLocaleDateString()}
                        </Typography>
                        {isJobOverdue(job) && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: "error.main",
                              fontWeight: "medium",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5
                            }}
                          >
                            Overdue
                          </Typography>
                        )}
                      </Stack>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <Chip
                        label={job.status.replace("_", " ").toLowerCase()}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(job.status),
                          color: "white",
                          width: "fit-content",
                          textTransform: "capitalize",
                        }}
                      />
                      <Typography
                        variant="body2"
                        color={
                          job.current_location
                            ? "text.primary"
                            : "text.secondary"
                        }
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: job.current_location
                              ? "success.main"
                              : "action.disabled",
                            display: "inline-block",
                          }}
                        />
                        {job.status.toLowerCase() === "complete"
                          ? "Done"
                          : job.current_location
                          ? job.current_location.asset.name
                          : "Waiting"}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="flex-end"
                    >
                      {job.status.toLowerCase() !== "complete" && (
                        <Button
                          startIcon={<KeyboardArrowDownIcon />}
                          onClick={() => {
                            setSelectedJob(job);
                            setSelectedStationId(0);
                            setIsMoveDialogOpen(true);
                          }}
                          sx={{
                            color: "text.secondary",
                            "&:hover": {
                              color: "primary.main",
                            },
                          }}
                        >
                          Move to Station
                        </Button>
                      )}
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          setMenuAnchorEl(event.currentTarget);
                          setActiveJobId(job.id);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    style={{ paddingBottom: 0, paddingTop: 0 }}
                    colSpan={5}
                  >
                    <Collapse
                      in={expandedJob === job.id}
                      timeout="auto"
                      unmountOnExit
                    >
                      <Box sx={{ margin: 2 }}>
                        <Typography variant="h6" gutterBottom component="div">
                          Station History
                        </Typography>
                        <Timeline
                          position="alternate"
                          sx={{ maxWidth: 800, mx: "auto", my: 2 }}
                        >
                          {jobHistories[job.id]?.map((location, index) => (
                            <TimelineItem key={location.id}>
                              <TimelineOppositeContent color="text.secondary">
                                <Typography
                                  variant="body2"
                                  color="text.primary"
                                >
                                  {new Date(
                                    location.arrival_time
                                  ).toLocaleString()}
                                </Typography>
                                {location.departure_time && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    to{" "}
                                    {new Date(
                                      location.departure_time
                                    ).toLocaleString()}
                                  </Typography>
                                )}
                              </TimelineOppositeContent>
                              <TimelineSeparator>
                                <TimelineDot
                                  color={
                                    location.departure_time ? "grey" : "primary"
                                  }
                                />
                                {index <
                                  (jobHistories[job.id]?.length || 0) - 1 && (
                                  <TimelineConnector />
                                )}
                              </TimelineSeparator>
                              <TimelineContent>
                                <Paper
                                  elevation={2}
                                  sx={{
                                    p: 2,
                                    bgcolor: theme.palette.background.paper,
                                  }}
                                >
                                  <Typography variant="h6" component="div">
                                    {location.asset.name}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {location.departure_time
                                      ? "Completed"
                                      : "Current Location"}
                                  </Typography>
                                </Paper>
                              </TimelineContent>
                            </TimelineItem>
                          ))}
                        </Timeline>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Job</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Job Name"
              value={newJob.name}
              onChange={(e) =>
                setNewJob((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newJob.description}
              onChange={(e) =>
                setNewJob((prev) => ({ ...prev, description: e.target.value }))
              }
            />
            <FormControl fullWidth>
              <InputLabel>Customer</InputLabel>
              <Select
                value={newJob.customer_id}
                label="Customer"
                onChange={(e) =>
                  setNewJob((prev) => ({
                    ...prev,
                    customer_id: e.target.value as number,
                  }))
                }
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={newJob.due_date}
              onChange={(e) =>
                setNewJob((prev) => ({ ...prev, due_date: e.target.value }))
              }
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateJob}
            variant="contained"
            disabled={!newJob.name || !newJob.customer_id}
          >
            Add Job
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isMoveDialogOpen}
        onClose={() => setIsMoveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Move Job: {selectedJob?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Station</InputLabel>
              <Select
                value={selectedStationId}
                label="Station"
                onChange={(e) => setSelectedStationId(e.target.value as number)}
              >
                {stations.map((station) => (
                  <MenuItem key={station.id} value={station.id}>
                    <Box>
                      <Typography>{station.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {station.manufacturer} - {station.model}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsMoveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleMoveJob}
            variant="contained"
            disabled={!selectedStationId}
          >
            Move Job
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => {
          setMenuAnchorEl(null);
          setActiveJobId(null);
        }}
      >
        {jobs.find((job) => job.id === activeJobId)?.status.toLowerCase() !==
        "complete" ? (
          <MenuItem
            onClick={() => {
              if (activeJobId !== null) {
                handleCompleteJob(activeJobId);
              }
              setMenuAnchorEl(null);
              setActiveJobId(null);
            }}
            sx={{ color: theme.palette.success.main }}
          >
            Complete Job
          </MenuItem>
        ) : (
          activeJobId && (
            <MenuItem
              onClick={() => {
                handleUpdateJobStatus(activeJobId, "pending");
                setMenuAnchorEl(null);
                setActiveJobId(null);
              }}
              sx={{ color: theme.palette.warning.main }}
            >
              Set to Pending
            </MenuItem>
          )
        )}
      </Menu>
    </Box>
  );
}
