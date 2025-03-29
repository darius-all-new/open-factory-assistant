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

import { Typography, Box } from "@mui/material";

export const Home = () => {
  return (
    <Box sx={{ p: 4, flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to OpenFactoryAssistant!
      </Typography>
      <Typography variant="body1">
        Open-source job tracking for your factory.
      </Typography>
    </Box>
  );
};
