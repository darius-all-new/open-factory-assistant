import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { auth } from '../services/auth';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await auth.login(username, password);
      onLoginSuccess();
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        maxWidth: 400,
        p: 3,
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        Scanner Login
      </Typography>
      
      {error && <Alert severity="error">{error}</Alert>}
      
      <TextField
        required
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />
      
      <TextField
        required
        type="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      
      <Button
        type="submit"
        variant="contained"
        size="large"
      >
        Login
      </Button>
    </Box>
  );
}
