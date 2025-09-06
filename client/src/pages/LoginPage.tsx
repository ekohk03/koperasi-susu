import { Box, Button, Card, CardContent, CircularProgress, Container, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/auth/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<{ username: string; password: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (data) => {
    try {
      setLoading(true);
      setError(null);
      await login(data.username, data.password);
      navigate('/'); // Use navigate instead of window.location.href
    } catch (e: any) {
      setError(e.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  });

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Card sx={{ width: '100%', boxShadow: 3, borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Logo Koperasi Susu"
              sx={{ 
                width: 80, 
                height: 80, 
                mx: 'auto', 
                mb: 2,
                display: 'block',
                objectFit: 'contain'
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Koperasi Susu
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Silakan login untuk melanjutkan
            </Typography>
          </Box>
          <Box component="form" onSubmit={onSubmit}>
            <TextField 
              label="Username" 
              fullWidth 
              margin="normal" 
              {...register('username', { required: 'Username wajib diisi' })}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <TextField 
              label="Password" 
              type="password" 
              fullWidth 
              margin="normal" 
              {...register('password', { required: 'Password wajib diisi' })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              fullWidth 
              sx={{ mt: 2 }} 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {loading ? 'Memproses...' : 'Login'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
