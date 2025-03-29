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
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerJobs,
  Customer,
  CustomerCreate,
  Job,
  JobStatus,
} from "../services/customers";

const initialFormData: CustomerCreate = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

const getStatusColor = (status: JobStatus) => {
  switch (status) {
    case JobStatus.COMPLETED:
      return "success";
    case JobStatus.IN_PROGRESS:
      return "primary";
    case JobStatus.CANCELLED:
      return "error";
    default:
      return "default";
  }
};

export default function Customers() {
  const theme = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<CustomerCreate>(initialFormData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerJobs, setCustomerJobs] = useState<Job[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<CustomerCreate>>({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm) ||
          customer.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      // TODO: Add proper error handling UI
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      if (editingId) {
        await updateCustomer(editingId, formData);
      } else {
        await createCustomer(formData);
      }

      setIsFormOpen(false);
      setFormData(initialFormData);
      setEditingId(null);
      fetchCustomers();
    } catch (error) {
      if (error instanceof Error) {
        // Handle validation errors from Zod
        if (error.name === "ZodError") {
          const zodError = JSON.parse(error.message);
          const errors: Partial<CustomerCreate> = {};
          zodError.forEach((err: any) => {
            const field = err.path[0] as keyof CustomerCreate;
            errors[field] = err.message;
          });
          setFormErrors(errors);
        } else {
          console.error("Failed to save customer:", error);
          // TODO: Add proper error handling UI
        }
      }
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    });
    setEditingId(customer.id);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (customerToDelete) {
      try {
        await deleteCustomer(customerToDelete);
        setDeleteConfirmOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
      } catch (error) {
        console.error("Failed to delete customer:", error);
        // TODO: Add proper error handling UI
      }
    }
  };

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const jobs = await getCustomerJobs(customer.id);
      setCustomerJobs(jobs);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error("Failed to fetch customer jobs:", error);
      // TODO: Add proper error handling UI
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Customers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData(initialFormData);
            setEditingId(null);
            setIsFormOpen(true);
          }}
        >
          Add Customer
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.address}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleViewDetails(customer)}
                  >
                    <InfoIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleEdit(customer)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setCustomerToDelete(customer.id);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingId ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              margin="normal"
              error={!!formErrors.name}
              helperText={formErrors.name}
            />
            <TextField
              fullWidth
              label="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              margin="normal"
              error={!!formErrors.email}
              helperText={formErrors.email}
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              margin="normal"
              error={!!formErrors.phone}
              helperText={formErrors.phone}
            />
            <TextField
              fullWidth
              label="Address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              margin="normal"
              error={!!formErrors.address}
              helperText={formErrors.address}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingId ? "Save" : "Add"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this customer? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        PaperProps={{
          sx: { width: "40%" },
        }}
      >
        {selectedCustomer && (
          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h5">Customer Details</Typography>
              <IconButton onClick={() => setIsDetailsOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Typography variant="h6" gutterBottom>
              {selectedCustomer.name}
            </Typography>
            <Typography color="text.secondary" paragraph>
              Email: {selectedCustomer.email}
              <br />
              Phone: {selectedCustomer.phone}
              <br />
              Address: {selectedCustomer.address}
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Jobs
            </Typography>
            {customerJobs.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Job Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Due Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={job.status}
                            color={getStatusColor(job.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {job.due_date
                            ? new Date(job.due_date).toLocaleDateString()
                            : "No due date"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">No jobs found</Typography>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
