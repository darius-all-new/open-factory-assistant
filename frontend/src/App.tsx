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
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { CssBaseline, Box } from "@mui/material";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Navbar } from "./components/Navbar";
import { SignIn } from "./pages/SignIn";
import { Home } from "./pages/Home";
import Users from "./pages/Users";
import Customers from "./pages/Customers";
import Stations from "./pages/Stations";
import Jobs from "./pages/Jobs";
import TimelineView from "./pages/TimelineView";
import StationTracker from "./pages/StationTracker";
import FactoryView from "./pages/FactoryView";
import { getAuthToken } from "./api/auth";
import ErrorBoundary from "./components/ErrorBoundary";
import { logger } from "./services/logger";

const PrivateLayout = () => {
  const token = getAuthToken();
  if (!token) {
    logger.info("User redirected to signin - no auth token found");
    return <Navigate to="/signin" replace />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/signin" element={<SignIn />} />
              <Route element={<PrivateLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/users" element={<Users />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/stations" element={<Stations />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/timeline" element={<TimelineView />} />
                <Route path="/station-tracker" element={<StationTracker />} />
                <Route path="/factory-view" element={<FactoryView />} />
                <Route
                  path="*"
                  element={
                    <div>
                      <h2>404 Page not found</h2>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
