import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Tooltip,
  useTheme,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  ZoomIn,
  ZoomOut,
  RestartAlt,
  GridView,
  NavigateNext,
  NavigateBefore,
  Update,
  FiberManualRecord as LiveIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { getStations } from "../services/stations";
import { getJobs, getJobHistory, type JobLocation } from "../services/jobs";
import { DraggableStation } from "../components/DraggableStation";
import { useAuth } from "../contexts/AuthContext";
import type { Station } from "../types/types";
import type { Job } from "../services/jobs";
import { format } from "date-fns";

interface StationPositions {
  [key: number]: { x: number; y: number };
}

interface Position {
  x: number;
  y: number;
}

export const FactoryView = () => {
  const { token } = useAuth();
  const theme = useTheme();
  const [stations, setStations] = useState<Station[]>([]);
  const [positions, setPositions] = useState<StationPositions>({});
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedStationJobs, setSelectedStationJobs] = useState<Job[]>([]);
  const [isJobsDrawerOpen, setIsJobsDrawerOpen] = useState(false);
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobHistory, setJobHistory] = useState<JobLocation[] | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showMoveHighlight, setShowMoveHighlight] = useState(false);
  const [lastMove, setLastMove] = useState<{
    jobName: string;
    assetName: string;
  } | null>(null);
  const [liveModeMoveTime, setLiveModeMoveTime] = useState<Date | null>(null);
  const [previousUpdateTime, setPreviousUpdateTime] = useState<Date | null>(
    null
  );

  // Constants
  const STORAGE_KEY = "factory_view_station_positions";
  const VIEW_CONFIG_KEY = "factory_view_config";
  const DEFAULT_POSITION = { x: 50, y: 50 };
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 2;
  const SCALE_STEP = 0.1;
  const STATION_WIDTH = 120;
  const STATION_HEIGHT = 80;
  const GRID_GAP = 40;
  const ARROW_SIZE = 25;
  const ARROW_SPACING = 100;
  const JOB_HISTORY_INTERVAL = 5000; // milliseconds
  const JOB_UPDATE_NOTIFICATION_DURATION = 5000; // milliseconds
  const PATH_WIDTH = 4;
  const PATH_COLOR = "#ffffff";
  const ARRIVAL_PATH_COLOR = "#1bb1cf"; // Blue color for arrival path
  const COMPLETION_PATH_COLOR = "#4caf50"; // Green color for completion path

  // Parse timestamps with proper timezone handling
  const parseTimestamp = (timestamp: string | null): Date => {
    if (!timestamp) return new Date();

    // Parse the ISO timestamp (which is in UTC) and convert to local time
    const date = new Date(timestamp);

    // If timestamp doesn't have timezone info (Z or +/-), assume UTC
    if (!timestamp.endsWith("Z") && !timestamp.match(/[+-]\d{2}:?\d{2}$/)) {
      console.warn(`Timestamp ${timestamp} has no timezone info, assuming UTC`);
      return new Date(timestamp + "Z");
    }

    return date;
  };

  // Handle station jobs click
  const handleStationJobsClick = useCallback(
    (station: Station, jobs: Job[]) => {
      setSelectedStation(station);
      setSelectedStationJobs(jobs);
      setIsJobsDrawerOpen(true);
    },
    []
  );

  // Handle close jobs drawer
  const handleCloseJobsDrawer = useCallback(() => {
    setIsJobsDrawerOpen(false);
    setSelectedStation(null);
    setSelectedStationJobs([]);
  }, []);

  // Load/save positions from localStorage
  useEffect(() => {
    const loadPositions = (): StationPositions => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return {};

        const parsed = JSON.parse(saved);
        if (typeof parsed !== "object") return {};

        const validated: StationPositions = {};
        Object.entries(parsed).forEach(([id, pos]: [string, any]) => {
          if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
            validated[Number(id)] = { x: pos.x, y: pos.y };
          }
        });

        return validated;
      } catch (error) {
        console.error("Error loading station positions:", error);
        return {};
      }
    };

    setPositions(loadPositions());
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchStations = async () => {
      try {
        const fetchedStations = await getStations();
        if (mounted) {
          setStations(fetchedStations);

          // Clean up any positions for stations that no longer exist
          const currentIds = new Set(fetchedStations.map((s) => s.id));
          setPositions((prev) => {
            const newPositions: StationPositions = {};
            let hasChanges = false;

            Object.entries(prev).forEach(([id, pos]) => {
              if (currentIds.has(Number(id))) {
                newPositions[Number(id)] = pos;
              } else {
                hasChanges = true;
              }
            });

            return hasChanges ? newPositions : prev;
          });
        }
      } catch (err) {
        console.error("Error fetching stations:", err);
      }
    };

    fetchStations();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!token) return;

      try {
        const fetchedJobs = await getJobs(token);
        setJobs(fetchedJobs);
      } catch (err) {
        console.error("Error fetching jobs:", err);
      }
    };

    fetchJobs();
  }, [token]);

  // TODO: Lots of clear up here!
  // Function to refresh location history
  const refreshLocationHistory = useCallback(async () => {
    if (!selectedJob || !token) return;

    try {
      const history = await getJobHistory(selectedJob.id, token);

      if (history && history.length > 0) {
        // Find the job history element with the latest timestamp
        const latestHistoryElement = history.reduce((latest, current) => {
          const latestTime = parseTimestamp(latest.arrival_time);
          const currentTime = parseTimestamp(current.arrival_time);
          return currentTime > latestTime ? current : latest;
        });

        const jobWithLatestMove = jobs.find(
          (j) => j.id === latestHistoryElement.job_id
        );

        // Log previous and current timestamps
        const currentTime = new Date();
        // console.log("Previous Update Time:", previousUpdateTime);
        // console.log("Current Update Time:", currentTime);
        // console.log("Latest History Element:", latestHistoryElement);

        // check if the latest history element is after the previous update time ...
        // if it is ... that means it's just come in and we need to notify.
        // if it isn't then it's old and doesn't need an update.

        if (previousUpdateTime) {
          if (
            parseTimestamp(latestHistoryElement.arrival_time) >
            previousUpdateTime
          ) {
            // Notify
            console.log(
              "NOTIFY!!!!",
              parseTimestamp(latestHistoryElement.arrival_time),
              previousUpdateTime
            );
            handleNewMove(
              jobWithLatestMove?.name || "",
              stations.find((s) => s.id === latestHistoryElement.asset_id)
                ?.name || ""
            );
          } else if (
            latestHistoryElement.departure_time &&
            parseTimestamp(latestHistoryElement.departure_time) >
              previousUpdateTime
          ) {
            // Notify
            console.log("NOTIFY COMPLETE!!!!", jobWithLatestMove?.locations);
            handleNewMove(jobWithLatestMove?.name || "", "Completed");
          }
        }

        // Update the previous update time
        setPreviousUpdateTime(currentTime);
      }
    } catch (err) {
      console.error("Error fetching location history:", err);
    }
  }, [selectedJob, token, previousUpdateTime]);

  // Set up interval to refresh location history
  useEffect(() => {
    if (!selectedJob || !token || !isLive) return;

    refreshLocationHistory();
    const interval = setInterval(refreshLocationHistory, JOB_HISTORY_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedJob, token, isLive]);

  // Fetch job history when a job is selected
  useEffect(() => {
    const fetchJobHistory = async () => {
      if (!selectedJob || !token) {
        setJobHistory(null);
        setCurrentStep(0); // Always reset to first step when manually selecting a job

        if (jobHistory) {
          setPreviousUpdateTime(null);
        }

        return;
      }

      try {
        const history = await getJobHistory(selectedJob.id, token);
        if (history) {
          // Check if there's a new move by comparing with current history
          if (jobHistory && history.length > jobHistory.length) {
            const latestMove = history[history.length - 1];
            const station = stations.find((s) => s.id === latestMove.asset_id);
            // Only show notification if we're in live mode and the move happened after live mode was enabled
            if (
              station &&
              liveModeMoveTime &&
              parseTimestamp(latestMove.arrival_time) > liveModeMoveTime
            ) {
              //   handleNewMove(selectedJob.name, station.name);
            }
          } else if (jobHistory && history.length === jobHistory.length) {
            // Check if the job was just completed (last location got a departure time)
            const lastOldLocation = jobHistory[jobHistory.length - 1];
            const lastNewLocation = history[history.length - 1];
            if (
              !lastOldLocation.departure_time &&
              lastNewLocation.departure_time &&
              liveModeMoveTime &&
              parseTimestamp(lastNewLocation.departure_time) > liveModeMoveTime
            ) {
              //   handleNewMove(selectedJob.name, "Completed");
            }
          }
          setJobHistory(history);
        } else {
          setJobHistory(null);
        }
      } catch (err) {
        console.error("Error fetching job history:", err);
        setJobHistory(null);
      }
    };

    fetchJobHistory();

    if (isLive) {
      const interval = setInterval(fetchJobHistory, JOB_HISTORY_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [selectedJob, token, isLive, stations, liveModeMoveTime]);

  // Load saved view configuration
  useEffect(() => {
    const loadViewConfig = () => {
      try {
        const saved = localStorage.getItem(VIEW_CONFIG_KEY);
        if (!saved) return;

        const config = JSON.parse(saved);
        if (typeof config !== "object") return;

        if (typeof config.scale === "number") {
          setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, config.scale)));
        }

        if (
          config.pan &&
          typeof config.pan.x === "number" &&
          typeof config.pan.y === "number"
        ) {
          setPan(config.pan);
        }
      } catch (error) {
        console.error("Error loading view configuration:", error);
      }
    };

    loadViewConfig();
  }, []);

  // Handle zoom
  const handleZoom = useCallback(
    (newScale: number) => {
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      setScale(clampedScale);
      try {
        const config = { scale: clampedScale, pan };
        localStorage.setItem(VIEW_CONFIG_KEY, JSON.stringify(config));
      } catch (error) {
        console.error("Error saving view configuration:", error);
      }
    },
    [pan]
  );

  // Handle pan
  const handlePan = useCallback(
    (newPan: Position) => {
      setPan(newPan);
      try {
        const config = { scale, pan: newPan };
        localStorage.setItem(VIEW_CONFIG_KEY, JSON.stringify(config));
      } catch (error) {
        console.error("Error saving view configuration:", error);
      }
    },
    [scale]
  );

  // Handle station position change
  const handleStationPositionChange = useCallback(
    (station: Station, newPosition: Position) => {
      setPositions((prev) => {
        const updated = {
          ...prev,
          [station.id]: newPosition,
        };
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  // Handle station drag
  const handleStationDrag = useCallback(
    (station: Station, position: Position) => {
      handleStationPositionChange(station, position);
    },
    [handleStationPositionChange]
  );

  // Function to handle new job moves
  const handleNewMove = useCallback((jobName: string, assetName: string) => {
    setShowMoveHighlight(true);
    setLastMove({ jobName, assetName });

    // Reset highlight after JOB_UPDATE_NOTIFICATION_DURATION
    setTimeout(() => {
      setShowMoveHighlight(false);
    }, JOB_UPDATE_NOTIFICATION_DURATION);
  }, []);

  // Render stations
  const renderStations = useCallback(() => {
    return stations.map((station) => {
      const position = positions[station.id] || DEFAULT_POSITION;
      const stationJobs = jobs.filter(
        (job) => job.current_location?.asset_id === station.id
      );

      return (
        <DraggableStation
          key={station.id}
          station={station}
          position={position}
          onPositionChange={(newPos) => handleStationDrag(station, newPos)}
          scale={scale}
          onJobsClick={handleStationJobsClick}
          jobs={stationJobs}
        />
      );
    });
  }, [
    stations,
    positions,
    jobs,
    scale,
    handleStationDrag,
    handleStationJobsClick,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't start panning if clicking on a station
      if ((e.target as HTMLElement).closest("[data-station-id]")) {
        return;
      }

      if (e.button === 0) {
        // Left click only
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;

      // Don't pan if we're dragging a station
      if ((e.target as HTMLElement).closest("[data-station-id]")) {
        return;
      }

      handlePan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [isDragging, dragStart, handlePan]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel events with non-passive listener
  const handleWheelEvent = useCallback(
    (e: WheelEvent) => {
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
        handleZoom(scale + delta);
      } else {
        e.preventDefault(); // Prevent default scroll
        handlePan({
          x: pan.x - e.deltaX,
          y: pan.y - e.deltaY,
        });
      }
    },
    [scale, pan, handleZoom, handlePan]
  );

  // Handle job selection
  const handleJobSelect = useCallback(
    async (job: Job | null) => {
      setSelectedJob(job);
      setJobHistory(null);
      setCurrentStep(0); // Always reset to first step when manually selecting a job

      if (job && token) {
        try {
          const history = await getJobHistory(job.id, token);
          setJobHistory(history || null);
        } catch (err) {
          console.error("Error fetching job history:", err);
          setJobHistory(null);
        }
      }
    },
    [token]
  );

  // Refresh data
  const refreshData = useCallback(async () => {
    if (!token) return;

    try {
      // Fetch fresh jobs and stations data
      const [fetchedJobs, fetchedStations] = await Promise.all([
        getJobs(token),
        getStations(),
      ]);

      setJobs(fetchedJobs);
      setStations(fetchedStations);

      // Find job with latest move by checking each job's history
      let latestJob: Job | null = null;
      let latestTime = new Date(0);
      let latestHistory: JobLocation[] | null = null;

      for (const job of fetchedJobs) {
        const history = await getJobHistory(job.id, token);
        if (history && history.length > 0) {
          const lastMove = history[history.length - 1];
          const moveTime = parseTimestamp(
            lastMove.departure_time ?? lastMove.arrival_time
          );
          if (moveTime > latestTime) {
            latestTime = moveTime;
            latestJob = job;
            latestHistory = history;
          }
        }
      }

      if (latestJob && latestHistory) {
        setSelectedJob(latestJob);
        setJobHistory(latestHistory);
        // Set to second-to-last step to show the latest movement
        setCurrentStep(Math.max(0, latestHistory.length - 2));
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  }, [token]);

  // Toggle live mode
  const toggleLive = useCallback(() => {
    setIsLive((prev) => {
      if (!prev) {
        // If turning live mode ON
        setLiveModeMoveTime(new Date()); // Set the initial time
      } else {
        // If turning live mode OFF
        setLiveModeMoveTime(null); // Clear the time
      }
      return !prev;
    });
  }, []);

  // Live mode effect
  useEffect(() => {
    if (!isLive) return;

    // Initial refresh
    refreshData();

    // Set up interval
    const interval = setInterval(refreshData, JOB_HISTORY_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [isLive, refreshData]);

  // Helper function to calculate center point of a station
  const getStationCenter = useCallback(
    (pos: Position) => ({
      x: pos.x + STATION_WIDTH / 2,
      y: pos.y + STATION_HEIGHT / 2,
    }),
    []
  );

  // Helper function to create a path between two points
  const createPath = useCallback(
    (
      start: Position,
      end: Position,
      color: string,
      tooltipInfo: string,
      key: string,
      isHorizontalFirst = true
    ) => {
      // Calculate corner point for L-shaped path
      const cornerPoint = isHorizontalFirst
        ? { x: end.x, y: start.y }
        : { x: start.x, y: end.y };

      // Calculate segment lengths
      const firstSegmentLength = isHorizontalFirst
        ? Math.abs(cornerPoint.x - start.x)
        : Math.abs(cornerPoint.y - start.y);

      const secondSegmentLength = isHorizontalFirst
        ? Math.abs(end.y - cornerPoint.y)
        : Math.abs(end.x - cornerPoint.x);

      // Calculate number of arrows for each segment
      const numArrowsFirst = Math.max(
        1,
        Math.floor(firstSegmentLength / ARROW_SPACING)
      );
      const numArrowsSecond = Math.max(
        1,
        Math.floor(secondSegmentLength / ARROW_SPACING)
      );

      return (
        <g key={key}>
          <path
            d={`M ${start.x} ${start.y} L ${cornerPoint.x} ${cornerPoint.y}`}
            fill="none"
            stroke={color}
            strokeWidth={PATH_WIDTH}
            strokeDasharray="6,3"
            style={{ transition: "all 0.3s ease" }}
          />
          <path
            d={`M ${cornerPoint.x} ${cornerPoint.y} L ${end.x} ${end.y}`}
            fill="none"
            stroke={color}
            strokeWidth={PATH_WIDTH}
            strokeDasharray="6,3"
            style={{ transition: "all 0.3s ease" }}
          />
          {createArrowMarkers(
            start,
            cornerPoint,
            numArrowsFirst,
            `first-${key}`,
            tooltipInfo,
            color
          )}
          {createArrowMarkers(
            cornerPoint,
            end,
            numArrowsSecond,
            `second-${key}`,
            tooltipInfo,
            color
          )}
        </g>
      );
    },
    []
  );

  // Generate path between stations for current step
  const generatePath = useCallback(
    (history: JobLocation[], step: number) => {
      if (!history || history.length < 1) return null;

      const elements = [];

      // Get positions and centers
      const currentPos = positions[history[step].asset_id];
      if (!currentPos) return null;

      const currentCenter = getStationCenter(currentPos);

      // Show arrival path for first step or jobs with just one location
      if (step === 0) {
        // First, determine the direction of the next path (if any)
        let nextPathDirection = null;
        if (history.length > 1) {
          const nextPos = positions[history[1].asset_id];
          if (nextPos) {
            const nextCenter = getStationCenter(nextPos);
            const dx = nextCenter.x - currentCenter.x;
            const dy = nextCenter.y - currentCenter.y;
            // Use the primary movement direction
            if (Math.abs(dx) >= Math.abs(dy)) {
              nextPathDirection = dx > 0 ? "right" : "left";
            } else {
              nextPathDirection = dy > 0 ? "bottom" : "top";
            }
          }
        }

        // Calculate the best direction for the arrival path based on surrounding stations
        const surroundingStations = Object.entries(positions).filter(
          ([id, pos]: [string, any]) =>
            id !== history[0].asset_id.toString() &&
            Math.abs(pos.x - currentPos.x) < STATION_WIDTH * 4 &&
            Math.abs(pos.y - currentPos.y) < STATION_HEIGHT * 4
        );

        // Define all possible directions with their clearance scores
        const directions = [
          { x: -1, y: 0, name: "left" }, // Left
          { x: 1, y: 0, name: "right" }, // Right
          { x: 0, y: -1, name: "top" }, // Top
          { x: 0, y: 1, name: "bottom" }, // Bottom
        ];

        // Calculate clearance scores for all directions
        const directionScores = directions.map((dir) => {
          // Base clearance on closest station in this direction
          const clearance = surroundingStations.reduce((min, [_, pos]) => {
            const distance =
              dir.x !== 0
                ? Math.abs(pos.x - currentPos.x)
                : Math.abs(pos.y - currentPos.y);
            return Math.min(min, distance);
          }, Infinity);

          // Penalize directions that have stations within immediate vicinity
          const hasNearbyStation = surroundingStations.some(([_, pos]) => {
            const dx = pos.x - currentPos.x;
            const dy = pos.y - currentPos.y;
            // Check if station is in this direction and close
            if (dir.x !== 0) {
              return (
                Math.sign(dx) === Math.sign(dir.x) &&
                Math.abs(dx) < STATION_WIDTH * 3 &&
                Math.abs(dy) < STATION_HEIGHT
              );
            } else {
              return (
                Math.sign(dy) === Math.sign(dir.y) &&
                Math.abs(dy) < STATION_HEIGHT * 3 &&
                Math.abs(dx) < STATION_WIDTH
              );
            }
          });

          return {
            ...dir,
            clearance: hasNearbyStation ? clearance * 0.5 : clearance, // Penalize directions with nearby stations
          };
        });

        // Sort directions by clearance (highest to lowest)
        directionScores.sort((a, b) => b.clearance - a.clearance);

        // Pick the direction with highest clearance that doesn't conflict with next path
        let arrivalDirection =
          directionScores.find((dir) => dir.name !== nextPathDirection) ||
          directionScores[0];

        const arrivalStart = {
          x: currentCenter.x + arrivalDirection.x * STATION_WIDTH * 2,
          y: currentCenter.y + arrivalDirection.y * STATION_HEIGHT * 2,
        };

        const tooltipInfo = `Job Started\nArrived at: ${
          history[0].asset.name
        }\nTime: ${
          history[0].arrival_time
            ? format(parseTimestamp(history[0].arrival_time), "MMM d, HH:mm")
            : ""
        }`;

        elements.push(
          <g key="path-start">
            <path
              d={`M ${arrivalStart.x} ${arrivalStart.y} L ${currentCenter.x} ${currentCenter.y}`}
              fill="none"
              stroke={ARRIVAL_PATH_COLOR}
              strokeWidth={PATH_WIDTH}
              strokeDasharray="6,3"
              style={{ transition: "all 0.3s ease" }}
            />
            {createArrowMarkers(
              arrivalStart,
              currentCenter,
              1,
              "start",
              tooltipInfo,
              ARRIVAL_PATH_COLOR
            )}
          </g>
        );
      }

      // For jobs with multiple locations, also show paths between stations
      if (history.length > 1 && step + 1 < history.length) {
        const nextPos = positions[history[step + 1].asset_id];
        if (!nextPos) return <>{elements}</>;

        const nextCenter = getStationCenter(nextPos);

        // Skip if stations are at the same position
        if (currentPos.x === nextPos.x && currentPos.y === nextPos.y)
          return <>{elements}</>;

        // Calculate regular path
        const dx = nextCenter.x - currentCenter.x;
        const dy = nextCenter.y - currentCenter.y;
        const isHorizontalFirst = Math.abs(dx) >= Math.abs(dy);

        const tooltipInfo = `From: ${history[step].asset.name}\nTo: ${
          history[step + 1].asset.name
        }\nTime: ${
          history[step + 1].arrival_time
            ? format(
                parseTimestamp(history[step + 1].arrival_time),
                "MMM d, HH:mm"
              )
            : ""
        }`;

        elements.push(
          createPath(
            currentCenter,
            nextCenter,
            PATH_COLOR,
            tooltipInfo,
            `path-${step}`,
            isHorizontalFirst
          )
        );

        // Add completion arrow if this is the last step of a completed job
        if (
          selectedJob?.status === "complete" &&
          ((step === history.length - 2 &&
            jobHistory?.[step + 1]?.departure_time) ||
            (step === history.length - 1 && jobHistory?.[step]?.departure_time))
        ) {
          // Continue in primary movement direction
          const completionEnd = {
            x: nextCenter.x,
            y: nextCenter.y,
          };

          if (Math.abs(dx) > Math.abs(dy)) {
            // If primary movement is horizontal, completion continues horizontally
            completionEnd.x += (dx > 0 ? 1 : -1) * STATION_WIDTH * 2;
          } else {
            // If primary movement is vertical, completion continues vertically
            completionEnd.y += (dy > 0 ? 1 : -1) * STATION_HEIGHT * 2;
          }

          const departureTime =
            step === history.length - 2
              ? jobHistory?.[step + 1]?.departure_time
              : jobHistory?.[step]?.departure_time;
          const formattedTime = departureTime
            ? format(parseTimestamp(departureTime as string), "MMM d, HH:mm")
            : "";
          const completionTooltip = `Job Completed\nTime: ${formattedTime}`;

          elements.push(
            <g key="path-completion">
              <path
                d={`M ${nextCenter.x} ${nextCenter.y} L ${completionEnd.x} ${completionEnd.y}`}
                fill="none"
                stroke={COMPLETION_PATH_COLOR}
                strokeWidth={PATH_WIDTH}
                strokeDasharray="6,3"
                style={{ transition: "all 0.3s ease" }}
              />
              {createArrowMarkers(
                nextCenter,
                completionEnd,
                1,
                "completion",
                completionTooltip,
                COMPLETION_PATH_COLOR
              )}
            </g>
          );
        }
      }

      return <>{elements}</>;
    },
    [positions, selectedJob?.status, createPath, getStationCenter, jobHistory]
  );

  // Helper function to create arrow markers
  const createArrowMarkers = useCallback(
    (
      start: Position,
      end: Position,
      numArrows: number,
      segmentId: string,
      tooltipInfo: string,
      color: string
    ) => {
      const markers = [];
      const dx = end.x - start.x;
      const dy = end.y - start.y;

      for (let i = 1; i <= numArrows; i++) {
        const t = i / (numArrows + 1);
        const x = start.x + dx * t;
        const y = start.y + dy * t;

        // Calculate angle based on the actual path direction
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        markers.push(
          <g
            key={`arrow-${segmentId}-${i}`}
            transform={`translate(${x}, ${y}) rotate(${angle})`}
          >
            <foreignObject
              x={-ARROW_SIZE / 2}
              y={-ARROW_SIZE / 2}
              width={ARROW_SIZE}
              height={ARROW_SIZE}
              style={{
                overflow: "visible",
                pointerEvents: "all",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Tooltip title={tooltipInfo} placement="top">
                  <div>
                    <svg
                      width={ARROW_SIZE}
                      height={ARROW_SIZE}
                      viewBox={`${-ARROW_SIZE / 2} ${
                        -ARROW_SIZE / 2
                      } ${ARROW_SIZE} ${ARROW_SIZE}`}
                      style={{ display: "block" }}
                    >
                      <path
                        d={`M${-ARROW_SIZE * 0.375},${-ARROW_SIZE * 0.375} L${
                          ARROW_SIZE * 0.375
                        },0 L${-ARROW_SIZE * 0.375},${ARROW_SIZE * 0.375} L${
                          -ARROW_SIZE * 0.125
                        },0 Z`}
                        fill={color}
                      />
                    </svg>
                  </div>
                </Tooltip>
              </div>
            </foreignObject>
          </g>
        );
      }
      return markers;
    },
    []
  );

  // Check if a job is overdue
  const isJobOverdue = useCallback((job: Job) => {
    return (
      job.due_date &&
      parseTimestamp(job.due_date) < new Date() &&
      job.status !== "complete"
    );
  }, []);

  // Filter jobs based on search term and status
  const filteredJobs = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase();
    return jobs.filter((job: Job) => {
      const matchesSearch = job.name.toLowerCase().includes(searchTermLower);
      const isOverdue = isJobOverdue(job);
      const matchesStatus =
        statusFilter.length === 0 ||
        statusFilter.includes(job.status) ||
        (statusFilter.includes("overdue") && isOverdue);
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter, isJobOverdue]);

  // Handle status filter change
  const handleStatusFilterChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newFilters: string[]) => {
      setStatusFilter(newFilters);
    },
    []
  );

  // Apply default grid layout
  const applyDefaultLayout = useCallback(() => {
    const totalStations = stations.length;
    const cols = Math.ceil(Math.sqrt(totalStations * 1.5));
    const rows = Math.ceil(totalStations / cols);

    const totalWidth = cols * STATION_WIDTH + (cols - 1) * GRID_GAP;
    const totalHeight = rows * STATION_HEIGHT + (rows - 1) * GRID_GAP;

    const startX = (1000 - totalWidth) / 2;
    const startY = (800 - totalHeight) / 2;

    const newPositions: StationPositions = {};
    stations.forEach((station, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      newPositions[station.id] = {
        x: startX + col * (STATION_WIDTH + GRID_GAP),
        y: startY + row * (STATION_HEIGHT + GRID_GAP),
      };
    });

    setPositions(newPositions);
    const savePositions = (positions: StationPositions): void => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
      } catch (error) {
        console.error("Error saving station positions:", error);
      }
    };
    savePositions(newPositions);
    handleZoom(1);
  }, [stations]);

  const handleLayoutDialogOpen = () => {
    setIsLayoutDialogOpen(true);
  };

  useEffect(() => {
    const container = document.getElementById("factory-view");
    if (!container) return;

    container.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheelEvent);
    };
  }, [handleWheelEvent]);

  return (
    <Box
      sx={{
        p: 3,
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: theme.palette.primary.main }}
        >
          Factory View
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={toggleLive}
          sx={{
            bgcolor: isLive ? "success.main" : "background.paper",
            color: isLive ? "success.contrastText" : "text.secondary",
            border: "1px solid",
            borderColor: isLive ? "success.main" : "divider",
            "&:hover": {
              bgcolor: isLive ? "success.dark" : "action.hover",
            },
            transition: "all 0.3s ease",
            minWidth: 100,
            fontWeight: "medium",
          }}
          startIcon={
            <LiveIcon
              sx={{
                animation: isLive ? "pulse 2s infinite" : "none",
                "@keyframes pulse": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                  "100%": { opacity: 1 },
                },
              }}
            />
          }
        >
          LIVE
        </Button>
        <Tooltip title="Show Latest Move">
          <IconButton onClick={refreshData}>
            <Update />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton onClick={() => handleZoom(scale - SCALE_STEP)}>
            <ZoomOut />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom In">
          <IconButton onClick={() => handleZoom(scale + SCALE_STEP)}>
            <ZoomIn />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset View">
          <IconButton
            onClick={() => {
              handlePan({ x: 0, y: 0 });
              handleZoom(1);
            }}
          >
            <RestartAlt />
          </IconButton>
        </Tooltip>

        <Tooltip title="Default station layout">
          <IconButton onClick={handleLayoutDialogOpen}>
            <GridView />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Layout Dialog */}
      <Dialog
        open={isLayoutDialogOpen}
        onClose={() => setIsLayoutDialogOpen(false)}
      >
        <DialogTitle>Layout Options</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Would you like to reset the layout to the default grid pattern?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLayoutDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              applyDefaultLayout();
              setIsLayoutDialogOpen(false);
            }}
            variant="contained"
          >
            Reset Layout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job History Banner - Always visible */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          bgcolor: "background.paper",
          color: "text.primary",
          minHeight: "160px", // Set minimum height to prevent jumping
        }}
      >
        {selectedJob ? (
          selectedJob.status === "pending" ? (
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Job History: {selectedJob.name}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                This job is pending and hasn't started yet. No history is
                available until the job is moved to its first station.
              </Typography>
            </Box>
          ) : jobHistory && jobHistory.length > 0 ? (
            <>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Job History: {selectedJob.name}
                </Typography>
                {jobHistory.length > 1 ? (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Step {currentStep + 1} of {jobHistory.length - 1}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Job is in its first station (no history steps available)
                  </Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  {jobHistory[currentStep]?.asset ? (
                    <>
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        {/* If it's the first and only step, just show current location */}
                        {jobHistory.length === 1 ? (
                          <>
                            Current Location:{" "}
                            {jobHistory[currentStep].asset.name}
                          </>
                        ) : (
                          <>
                            {jobHistory[currentStep].asset.name}
                            {jobHistory[currentStep + 1]?.asset && (
                              <> → {jobHistory[currentStep + 1].asset.name}</>
                            )}
                          </>
                        )}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary", mt: 0.5 }}
                      >
                        {currentStep === 0 ? (
                          // Show initial arrival time for first step
                          <>
                            Started:{" "}
                            {jobHistory[0].arrival_time
                              ? format(
                                  parseTimestamp(jobHistory[0].arrival_time),
                                  "MMM d, HH:mm"
                                )
                              : ""}
                            {jobHistory[1]?.arrival_time && (
                              <>
                                <br />
                                Moved:{" "}
                                {jobHistory[1].arrival_time
                                  ? format(
                                      parseTimestamp(
                                        jobHistory[1].arrival_time
                                      ),
                                      "MMM d, HH:mm"
                                    )
                                  : ""}
                              </>
                            )}
                          </>
                        ) : currentStep === jobHistory.length - 2 &&
                          selectedJob?.status === "complete" ? (
                          // Show completion time for last step of completed job
                          <>
                            {jobHistory[currentStep + 1]?.arrival_time && (
                              <>
                                Moved:{" "}
                                {format(
                                  parseTimestamp(
                                    jobHistory[currentStep + 1].arrival_time
                                  ),
                                  "MMM d, HH:mm"
                                )}
                              </>
                            )}
                            {jobHistory[currentStep + 1]?.departure_time && (
                              <>
                                <br />
                                Completed:{" "}
                                {format(
                                  parseTimestamp(
                                    jobHistory[currentStep + 1]
                                      .departure_time as string
                                  ),
                                  "MMM d, HH:mm"
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          // Show move time for intermediate steps
                          <>
                            {jobHistory[currentStep + 1]?.arrival_time && (
                              <>
                                Moved:{" "}
                                {jobHistory[currentStep + 1].arrival_time
                                  ? format(
                                      parseTimestamp(
                                        jobHistory[currentStep + 1].arrival_time
                                      ),
                                      "MMM d, HH:mm"
                                    )
                                  : ""}
                              </>
                            )}
                          </>
                        )}
                      </Typography>
                    </>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      Loading job history...
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box
                sx={{
                  flex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  px: 2,
                  maxHeight: 120, // Allow for up to 3 rows
                  overflow: "auto",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    maxWidth: "100%",
                  }}
                >
                  {jobHistory.slice(0, -1).map((_, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Box
                        onClick={() => setCurrentStep(index)}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          bgcolor:
                            index === currentStep
                              ? "primary.main"
                              : "action.selected",
                          color:
                            index === currentStep
                              ? "primary.contrastText"
                              : "text.primary",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor:
                              index === currentStep
                                ? "primary.dark"
                                : "action.hover",
                          },
                          fontSize: "0.875rem",
                        }}
                      >
                        {index + 1}
                      </Box>
                      {index < jobHistory.length - 2 && (
                        <Box
                          sx={{
                            width: 16,
                            height: 2,
                            bgcolor: "action.selected",
                            mx: 1,
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  gap: 1,
                  justifyContent: "flex-end",
                }}
              >
                <IconButton
                  onClick={() =>
                    setCurrentStep((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentStep === 0}
                  size="small"
                  sx={{ color: "text.primary" }}
                >
                  <NavigateBefore />
                </IconButton>
                <IconButton
                  onClick={() =>
                    setCurrentStep((prev) =>
                      Math.min(jobHistory.length - 2, prev + 1)
                    )
                  }
                  disabled={currentStep >= jobHistory.length - 2}
                  size="small"
                  sx={{ color: "text.primary" }}
                >
                  <NavigateNext />
                </IconButton>
              </Box>
            </>
          ) : (
            // Placeholder content when no job is selected
            // TODO: Tidy this
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="subtitle1" sx={{ color: "text.secondary" }}>
                Select a job to view its history
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.disabled", mt: 1 }}
              >
                The job's movement through the factory will be displayed here
              </Typography>
            </Box>
          )
        ) : (
          // Placeholder content when no job is selected
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="subtitle1" sx={{ color: "text.secondary" }}>
              Select a job to view its history
            </Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", mt: 1 }}>
              The job's movement through the factory will be displayed here
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: "flex", gap: 2, flex: 1, minHeight: 0 }}>
        {/* Jobs Panel */}
        <Paper
          elevation={1}
          sx={{
            width: 300,
            p: 2,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Jobs
          </Typography>

          {/* Search and Filters */}
          <Box sx={{ mb: 2 }}>
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
              sx={{ mb: 1 }}
            />
            <ToggleButtonGroup
              value={statusFilter}
              onChange={handleStatusFilterChange}
              aria-label="job status filter"
              size="small"
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                "& .MuiToggleButton-root": {
                  flex: "1 1 calc(50% - 4px)",
                  minWidth: 0,
                  textTransform: "none",
                  py: 0.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "4px !important",
                  "&.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": {
                      backgroundColor: "primary.dark",
                    },
                  },
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                },
              }}
              exclusive={false}
            >
              <ToggleButton value="in_progress" aria-label="in progress">
                In Progress
              </ToggleButton>
              <ToggleButton value="complete" aria-label="completed">
                Completed
              </ToggleButton>
              <ToggleButton value="pending" aria-label="pending">
                Pending
              </ToggleButton>
              <ToggleButton value="overdue" aria-label="overdue">
                Overdue
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <List sx={{ overflow: "auto", flex: 1 }}>
            {filteredJobs.map((job) => (
              <ListItem
                key={job.id}
                sx={{
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  backgroundColor:
                    selectedJob?.id === job.id
                      ? "action.selected"
                      : "transparent",
                  cursor: "pointer",
                  borderRadius: 1,
                  mb: 0.5,
                }}
                onClick={() =>
                  handleJobSelect(job.id === selectedJob?.id ? null : job)
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {job.name}
                      {isJobOverdue(job) && (
                        <Chip
                          label="Overdue"
                          size="small"
                          color="error"
                          icon={<WarningIcon />}
                          sx={{ height: 24 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={`Status: ${job.status}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        <Box
          id="factory-view"
          sx={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
            borderRadius: 1,
            border: showMoveHighlight ? "2px solid" : "1px solid",
            borderColor: showMoveHighlight ? "success.main" : "divider",
            transition: "all 0.3s ease",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Box
            sx={{
              position: "absolute",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "0 0",
              width: "100%",
              height: "100%",
            }}
          >
            <svg
              width="100%"
              height="100%"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                minWidth: "2000px",
                minHeight: "1000px",
                overflow: "visible",
              }}
              preserveAspectRatio="none"
            >
              {selectedJob &&
                jobHistory &&
                generatePath(jobHistory, currentStep)}
            </svg>
            {renderStations()}
          </Box>
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={isJobsDrawerOpen}
        onClose={handleCloseJobsDrawer}
        PaperProps={{
          sx: { width: 300 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6">
              {selectedStation ? `${selectedStation.name} Jobs` : "Jobs"}
            </Typography>
            <IconButton onClick={handleCloseJobsDrawer}>
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            {selectedStationJobs.map((job) => (
              <ListItem
                key={job.id}
                sx={{
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  backgroundColor:
                    selectedJob?.id === job.id
                      ? "action.selected"
                      : "transparent",
                  cursor: "pointer",
                  borderRadius: 1,
                  mb: 0.5,
                }}
                onClick={() =>
                  handleJobSelect(job.id === selectedJob?.id ? null : job)
                }
              >
                <ListItemText
                  primary={job.name}
                  secondary={`Status: ${job.status}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Move Notification */}
      <Snackbar
        open={showMoveHighlight}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          mt: 7, // Offset to avoid overlapping with the header
          left: "50% !important",
          transform: "translateX(-50%)",
        }}
      >
        <Alert
          severity="info"
          sx={{
            width: "100%",
            minWidth: 300,
            bgcolor: "success.light",
            color: "success.contrastText",
            "& .MuiAlert-icon": {
              color: "success.contrastText",
            },
          }}
        >
          {lastMove &&
            `New move detected: ${lastMove.jobName} → ${lastMove.assetName}`}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FactoryView;
