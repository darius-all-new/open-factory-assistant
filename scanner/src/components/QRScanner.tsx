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

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, QrcodeSuccessCallback } from "html5-qrcode";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Snackbar,
  Container,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  AppBar,
  Toolbar,
  IconButton,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  moveJobToStation,
  getJob,
  getAllAssets,
  completeJob,
} from "../services/api";
import { logger } from "../services/logger";

const scanRegionId = "html5qr-code-full-region";

interface QRCodeData {
  job: number;
}

interface Asset {
  id: number;
  name: string;
}

interface EntityNames {
  jobName: string;
}

type ScanProps = {
  verbose?: boolean;
  onLogout: () => void;
  fps?: number;
  qrbox?: number;
  aspectRatio?: number;
  disableFlip?: boolean;
};

export const QRScanner = (props: ScanProps) => {
  const { verbose, onLogout, fps, qrbox, aspectRatio, disableFlip } = props;
  const ref = useRef<Html5QrcodeScanner | null>(null);
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null);
  const [entityNames, setEntityNames] = useState<EntityNames | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<number | "">("");
  const [selectStationOpen, setSelectStationOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const pauseScanning = () => {
    if (ref.current) {
      ref.current.pause();
    }
  };

  const resumeScanning = () => {
    if (ref.current) {
      ref.current.resume();
    }
  };

  const fetchEntityNames = async (jobId: number) => {
    try {
      setLoading(true);
      const job = await getJob(jobId);
      setEntityNames({
        jobName: job.name,
      });
      logger.info("Job details retrieved", { jobId: jobId, jobName: job.name });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to fetch job details",
        severity: "error",
      });
      logger.error("Error fetching job details", { error, jobId: jobId });
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const assets = await getAllAssets();
      setAssets(assets);
      logger.debug("Assets retrieved", { assetCount: assets.length });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to fetch stations",
        severity: "error",
      });
      logger.error("Error fetching assets", { error });
    } finally {
      setLoading(false);
    }
  };

  const handleQrCodeSuccess: QrcodeSuccessCallback = async (decodedText) => {
    try {
      const data = JSON.parse(decodedText) as QRCodeData;
      logger.info("QR code scanned successfully", { jobId: data.job });
      if (typeof data.job === "number") {
        setScannedData(data);
        setDialogOpen(true);
        pauseScanning();
        await fetchEntityNames(data.job);
      } else {
        throw new Error("Invalid QR code format");
      }
    } catch (error) {
      logger.error("Error processing QR code", { error, decodedText });
      setSnackbar({
        open: true,
        message: "Invalid QR code format. Expected: { job: number }",
        severity: "error",
      });
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectStationOpen(false);
    setSelectedAsset("");
    resumeScanning();
  };

  const handleMoveToStation = async () => {
    if (!scannedData || !selectedAsset) return;

    setLoading(true);
    try {
      await moveJobToStation(scannedData.job, selectedAsset as number);
      logger.info("Job moved to station", { 
        jobId: scannedData.job, 
        stationId: selectedAsset,
        jobName: entityNames?.jobName 
      });
      setSnackbar({
        open: true,
        message: "Job moved successfully",
        severity: "success",
      });
      setSelectStationOpen(false);
      setDialogOpen(false);
      resumeScanning();
    } catch (error) {
      logger.error("Error moving job", { 
        error, 
        jobId: scannedData.job, 
        stationId: selectedAsset 
      });
      setSnackbar({
        open: true,
        message: "Failed to move job",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStationSelect = async () => {
    await fetchAssets();
    setSelectStationOpen(true);
  };

  const handleCompleteJob = async () => {
    if (!scannedData) return;

    setLoading(true);
    try {
      await completeJob(scannedData.job);
      logger.info("Job completed", { 
        jobId: scannedData.job,
        jobName: entityNames?.jobName 
      });
      setSnackbar({
        open: true,
        message: "Job completed successfully",
        severity: "success",
      });
      setDialogOpen(false);
      resumeScanning();
    } catch (error) {
      logger.error("Error completing job", { 
        error, 
        jobId: scannedData.job 
      });
      setSnackbar({
        open: true,
        message: "Failed to complete job",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (ref.current === null) {
      ref.current = new Html5QrcodeScanner(
        scanRegionId,
        {
          fps: fps || 10,
          qrbox: qrbox || { width: 250, height: 250 },
          aspectRatio: aspectRatio || undefined,
          disableFlip: disableFlip || false,
        },
        verbose
      );
    }
    const html5QrcodeScanner = ref.current;

    setTimeout(() => {
      const container = document.getElementById(scanRegionId);
      if (html5QrcodeScanner && container?.innerHTML == "") {
        html5QrcodeScanner.render(handleQrCodeSuccess, undefined);
      }
    }, 0);

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
      }
    };
  }, []);

  return (
    <Container maxWidth="sm" sx={{ height: "100vh", position: "relative" }}>
      <AppBar
        position="absolute"
        color="transparent"
        sx={{ top: 0, left: 0, right: 0 }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            QR Scanner
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onLogout}
            aria-label="logout"
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ pt: 8, height: "100%" }}>
        <div id={scanRegionId} />

        <Dialog open={dialogOpen} onClose={handleClose}>
          <DialogTitle>Scanned Job</DialogTitle>
          <DialogContent>
            {loading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography variant="body1" gutterBottom>
                  Job: {entityNames?.jobName}
                </Typography>
                <Box mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleOpenStationSelect}
                    fullWidth
                  >
                    Move to Station
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleCompleteJob}
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    Complete Job
                  </Button>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={selectStationOpen} onClose={handleClose}>
          <DialogTitle>Select Station</DialogTitle>
          <DialogContent>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Station</InputLabel>
                <Select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value as number)}
                  label="Station"
                >
                  {assets.map((asset) => (
                    <MenuItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleMoveToStation}
              variant="contained"
              color="primary"
              disabled={!selectedAsset}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};
