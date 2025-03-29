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

import { useState, useRef, useEffect } from "react";
import { Box, Typography, useTheme, IconButton } from "@mui/material";
import { ListAlt } from "@mui/icons-material";
import type { Station } from "../types/types";
import type { Job } from "../services/jobs";

interface Position {
  x: number;
  y: number;
}

interface DraggableStationProps {
  station: Station;
  position: Position;
  onPositionChange: (position: Position) => void;
  scale: number;
  onJobsClick: (station: Station, jobs: Job[]) => void;
  jobs: Job[];
}

export const DraggableStation = ({
  station,
  position,
  onPositionChange,
  scale,
  onJobsClick,
  jobs,
}: DraggableStationProps) => {
  const theme = useTheme();
  const [currentPosition, setCurrentPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const stationRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartMousePos = useRef({ x: 0, y: 0 });
  const latestPosition = useRef(position);

  useEffect(() => {
    setCurrentPosition(position);
    latestPosition.current = position;
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking the jobs button
    if ((e.target as HTMLElement).closest(".jobs-button")) {
      return;
    }

    setIsDragging(true);
    dragStartPos.current = currentPosition;
    dragStartMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const dx = (e.clientX - dragStartMousePos.current.x) / scale;
    const dy = (e.clientY - dragStartMousePos.current.y) / scale;

    const newPosition = {
      x: dragStartPos.current.x + dx,
      y: dragStartPos.current.y + dy,
    };

    setCurrentPosition(newPosition);
    latestPosition.current = newPosition;
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onPositionChange(latestPosition.current);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleJobsClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onJobsClick(station, jobs);
  };

  return (
    <Box
      ref={stationRef}
      data-station-id={station.id}
      sx={{
        position: "absolute",
        left: currentPosition.x,
        top: currentPosition.y,
        width: 120,
        height: 80,
        backgroundColor: theme.palette.background.paper,
        border: `2px solid ${theme.palette.primary.main}`,
        borderRadius: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        boxShadow: isDragging ? 4 : 1,
        transition: isDragging ? "none" : "box-shadow 0.2s",
        zIndex: isDragging ? 1000 : 1,
        p: 1.5,
      }}
      onMouseDown={handleMouseDown}
    >
      <Box sx={{ width: "100%" }}>
        <Typography
          variant="subtitle1"
          color="textPrimary"
          sx={{
            fontWeight: "medium",
            lineHeight: 1.2,
            mb: 0.5,
          }}
        >
          {station.name}
        </Typography>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          Jobs: {jobs.length}
        </Typography>
      </Box>
      <IconButton
        size="small"
        className="jobs-button"
        onClick={handleJobsClick}
        sx={{
          position: "absolute",
          right: 4,
          bottom: 4,
          backgroundColor: theme.palette.background.paper,
          "&:hover": {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <ListAlt fontSize="small" />
      </IconButton>
    </Box>
  );
};
