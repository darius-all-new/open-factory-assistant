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

import { useState, useEffect } from "react";
import { ThemeProvider, CssBaseline, createTheme, Box } from "@mui/material";
import { QRScanner } from "./components/QRScanner";
import { Login } from "./components/Login";
import { auth } from "./services/auth";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(auth.isAuthenticated());

  const darkTheme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  useEffect(() => {
    // Check authentication status on mount
    setIsAuthenticated(auth.isAuthenticated());
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    auth.logout();
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isAuthenticated ? (
          <QRScanner onLogout={handleLogout} />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
