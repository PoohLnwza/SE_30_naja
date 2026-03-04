'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  MenuItem,
  Link as MuiLink,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  PersonAddRounded,
  LocalHospitalRounded,
} from '@mui/icons-material';
import NextLink from 'next/link';
import api from '@/lib/api';

const userTypes = [
  { value: 'parent', label: 'ผู้ปกครอง' },
  { value: 'staff', label: 'เจ้าหน้าที่' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    userType: 'parent',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (form.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        username: form.username,
        password: form.password,
        userType: form.userType,
      });
      router.push('/login');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at 80% 50%, rgba(124,77,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(0,188,212,0.1) 0%, transparent 50%), #0A0E1A',
        px: 2,
      }}
    >
      {/* Decorative orbs */}
      <Box
        sx={{
          position: 'fixed',
          top: '20%',
          right: '8%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(124,77,255,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          bottom: '10%',
          left: '5%',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0,188,212,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <Card
        sx={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo & Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #00BCD4 0%, #7C4DFF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                boxShadow: '0 8px 24px rgba(0,188,212,0.3)',
              }}
            >
              <LocalHospitalRounded sx={{ fontSize: 32, color: '#fff' }} />
            </Box>
            <Typography variant="h5" sx={{ color: '#E8EAED', mb: 0.5 }}>
              สมัครสมาชิก
            </Typography>
            <Typography variant="body2" sx={{ color: '#9AA0A6' }}>
              สร้างบัญชีเพื่อเข้าใช้ ADHD Clinic
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="ชื่อผู้ใช้"
              value={form.username}
              onChange={handleChange('username')}
              sx={{ mb: 2.5 }}
              autoFocus
              required
            />
            <TextField
              fullWidth
              label="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange('password')}
              sx={{ mb: 2.5 }}
              required
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#9AA0A6' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              fullWidth
              label="ยืนยันรหัสผ่าน"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              sx={{ mb: 2.5 }}
              required
            />
            <TextField
              fullWidth
              select
              label="ประเภทผู้ใช้"
              value={form.userType}
              onChange={handleChange('userType')}
              sx={{ mb: 3 }}
            >
              {userTypes.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <PersonAddRounded />
                )
              }
              sx={{ mb: 2.5, py: 1.5 }}
            >
              {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
            </Button>
          </Box>

          <Typography
            variant="body2"
            sx={{ textAlign: 'center', color: '#9AA0A6' }}
          >
            มีบัญชีอยู่แล้ว?{' '}
            <MuiLink
              component={NextLink}
              href="/login"
              sx={{
                color: '#00BCD4',
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              เข้าสู่ระบบ
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
