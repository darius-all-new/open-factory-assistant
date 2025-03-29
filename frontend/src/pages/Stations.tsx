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
  Collapse,
  useTheme,
  Badge,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import EngineeringIcon from "@mui/icons-material/Engineering";
import { useAuth } from "../contexts/AuthContext";
import {
  getStations,
  getStationCurrentJobs,
  createStation,
} from "../services/stations";
import type { Station, Job, NewStationData } from "../types/types";

interface StationFormData {
  name: string;
  manufacturer: string;
  model: string;
  description: string;
}

export default function Stations() {
  const { token } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showOnlyWithJobs, setShowOnlyWithJobs] = useState(false);
  const [newStation, setNewStation] = useState<NewStationData>({
    name: "",
    manufacturer: "",
    model: "",
    description: "",
  });

  const fetchStations = async () => {
    try {
      const data = await getStations();

      // Fetch current jobs for each station
      const stationsWithJobs = await Promise.all(
        data.map(async (station: Station) => {
          try {
            const jobs = await getStationCurrentJobs(station.id);
            return { ...station, current_jobs: jobs };
          } catch (error) {
            console.error(
              `Error fetching jobs for station ${station.id}:`,
              error
            );
            return station;
          }
        })
      );

      setStations(stationsWithJobs);
    } catch (error) {
      console.error("Error fetching stations:", error);
    }
  };

  useEffect(() => {
    fetchStations();
  }, [token]);

  const handleAddStation = async () => {
    try {
      await createStation(newStation);
      setIsAddDialogOpen(false);
      setNewStation({ name: "", manufacturer: "", model: "", description: "" });
      fetchStations();
    } catch (error) {
      console.error("Error adding station:", error);
    }
  };

  const filteredStations = stations.filter((station) => {
    const matchesSearch =
      station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (station.description?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      );

    if (showOnlyWithJobs) {
      return (
        matchesSearch && station.current_jobs && station.current_jobs.length > 0
      );
    }

    return matchesSearch;
  });

  const Row = ({ station }: { station: Station }) => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();

    return (
      <React.Fragment>
        <TableRow
          sx={{
            "& > *": { borderBottom: "unset" },
            "&:hover": {
              bgcolor: theme.palette.action.hover,
            },
          }}
        >
          <TableCell padding="checkbox">
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell component="th" scope="row">
            <Typography variant="subtitle1" color="primary">
              {station.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {station.manufacturer} - {station.model}
            </Typography>
          </TableCell>
          <TableCell>{station.description || "-"}</TableCell>
          <TableCell align="center">
            <Badge
              badgeContent={station.current_jobs?.length || 0}
              color="primary"
              showZero
              sx={{
                "& .MuiBadge-badge": {
                  bgcolor: station.current_jobs?.length
                    ? theme.palette.primary.main
                    : theme.palette.action.disabled,
                },
              }}
            >
              <EngineeringIcon
                color={station.current_jobs?.length ? "primary" : "disabled"}
              />
            </Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box
                sx={{
                  margin: 2,
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  component="div"
                  color="primary"
                >
                  Current Jobs
                </Typography>
                {station.current_jobs?.length ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {station.current_jobs.map((job) => (
                      <React.Fragment key={job.id}>
                        <Box
                          sx={{
                            bgcolor: theme.palette.background.paper,
                            borderRadius: 1,
                            mb: 1,
                            border: `1px solid ${theme.palette.divider}`,
                            p: 2,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Typography variant="subtitle2">
                              {job.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                bgcolor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                              }}
                            >
                              #{job.id}
                            </Typography>
                          </Box>

                          {job.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              {job.description}
                            </Typography>
                          )}

                          {job.due_date && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: theme.palette.text.secondary,
                              }}
                            >
                              Due: {new Date(job.due_date).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      </React.Fragment>
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    No active jobs at this station
                  </Typography>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search stations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ mr: 1, color: "action.active" }} />
            ),
          }}
          sx={{ flex: 1 }}
        />
        <Button
          variant={showOnlyWithJobs ? "contained" : "outlined"}
          onClick={() => setShowOnlyWithJobs(!showOnlyWithJobs)}
          startIcon={<EngineeringIcon />}
          sx={{
            borderColor: showOnlyWithJobs ? "primary.main" : "divider",
            minWidth: 180,
          }}
        >
          {showOnlyWithJobs ? "Show All" : "Active Only"}
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsAddDialogOpen(true)}
        >
          Add Station
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table aria-label="stations table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Station</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="center">Jobs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStations.map((station) => (
              <Row key={station.id} station={station} />
            ))}
            {filteredStations.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">
                    No stations found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
        <DialogTitle>Add New Station</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            required
            value={newStation.name}
            onChange={(e) =>
              setNewStation({ ...newStation, name: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Manufacturer"
            fullWidth
            required
            value={newStation.manufacturer}
            onChange={(e) =>
              setNewStation({ ...newStation, manufacturer: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Model"
            fullWidth
            required
            value={newStation.model}
            onChange={(e) =>
              setNewStation({ ...newStation, model: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={newStation.description}
            onChange={(e) =>
              setNewStation({ ...newStation, description: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddStation} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
