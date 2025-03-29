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

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Button,
} from "@mui/material";
import { Brightness4, Brightness7, Logout } from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { signOut } from "../api/auth";

export const Navbar = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate("/signin");
  };

  return (
    <AppBar position="static" sx={{ width: "100%" }}>
      <Toolbar sx={{ width: "100%", maxWidth: "100%" }}>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          OpenFactoryAssistant
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mx: 4 }}>
          <Button
            color="inherit"
            component={Link}
            to="/users"
            sx={{ textTransform: "none" }}
          >
            Users
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/customers"
            sx={{ textTransform: "none" }}
          >
            Customers
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/stations"
            sx={{ textTransform: "none" }}
          >
            Stations
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/jobs"
            sx={{ textTransform: "none" }}
          >
            Jobs
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/timeline"
            sx={{ textTransform: "none" }}
          >
            Timeline
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/station-tracker"
            sx={{ textTransform: "none" }}
          >
            Station Tracker
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/factory-view"
            sx={{ textTransform: "none" }}
          >
            Factory View
          </Button>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton color="inherit" onClick={toggleTheme}>
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
