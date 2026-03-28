'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { AppShell, DashboardCard, StatCard } from '@/app/components/app-shell';
import { staffNav } from '@/app/components/navigation';
import api from '@/lib/api';
import type { Profile } from '@/lib/access';
import { formatDate, formatMoney } from '@/lib/format';

type PendingPayment = {
  payment_id: number;
  invoice_id: number;
  amount: string;
  method: string;
  status: string;
  slip_image: string | null;
  payment_date: string;
  invoice_total: string | null;
  child_name: string | null;
  visit_date: string | null;
};

export default function StaffPaymentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: profileData }, { data: paymentData }] = await Promise.all([
        api.get<Profile>('/auth/profile'),
        api.get<PendingPayment[]>('/payment/pending'),
      ]);
      setProfile(profileData);
      setPayments(paymentData);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to load pending payments';
      setError(Array.isArray(message) ? message.join(', ') : message);
      if (err?.response?.status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerify = async (paymentId: number, action: 'confirmed' | 'rejected') => {
    const label = action === 'confirmed' ? 'confirm' : 'reject';
    if (!window.confirm(`Are you sure you want to ${label} this payment?`)) return;

    setProcessing(paymentId);
    try {
      await api.patch(`/payment/${paymentId}/verify`, { action });
      fetchData();
    } catch (err: any) {
      const message = err?.response?.data?.message || `Unable to ${label} payment`;
      window.alert(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AppShell
      title="Payment Verification"
      subtitle="Review and verify pending payment slips from parents."
      navTitle="Guardian Care"
      navItems={staffNav(profile)}
      badge="Staff"
      profileName={profile?.username}
      profileMeta="Payment management"
      actions={
        <Button variant="outlined" onClick={() => router.push('/dashboard/staff')}>
          Dashboard
        </Button>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2} mb={3}>
        <StatCard label="Pending verifications" value={payments.length} />
        <StatCard
          label="Total pending amount"
          value={formatMoney(payments.reduce((sum, p) => sum + Number(p.amount), 0))}
        />
      </Box>

      {loading ? (
        <Box display="grid" minHeight={320} sx={{ placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {payments.length === 0 ? (
            <DashboardCard>
              <Typography variant="h5">No pending payments</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                All payments have been verified. Check back later.
              </Typography>
            </DashboardCard>
          ) : (
            payments.map((payment) => (
              <DashboardCard key={payment.payment_id}>
                <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
                  <Box flex={1}>
                    <Typography variant="h6">
                      {payment.child_name || 'Unknown'} — Invoice #{payment.invoice_id}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                      Amount: {formatMoney(Number(payment.amount))}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Invoice total: {formatMoney(Number(payment.invoice_total ?? 0))}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Payment date: {formatDate(payment.payment_date)}
                    </Typography>
                    {payment.visit_date && (
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Visit date: {formatDate(payment.visit_date)}
                      </Typography>
                    )}
                    {payment.slip_image && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" mb={0.5}>
                          Payment slip:
                        </Typography>
                        <Box
                          component="img"
                          src={payment.slip_image}
                          alt="Payment slip"
                          sx={{
                            maxWidth: 300,
                            width: '100%',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      </Box>
                    )}
                    {!payment.slip_image && (
                      <Chip label="No slip uploaded" size="small" color="warning" sx={{ mt: 1 }} />
                    )}
                  </Box>

                  <Stack spacing={1} alignItems="flex-end" justifyContent="flex-start">
                    <Chip label="Pending" color="warning" />
                    <Button
                      variant="contained"
                      color="success"
                      disabled={processing === payment.payment_id}
                      onClick={() => handleVerify(payment.payment_id, 'confirmed')}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      disabled={processing === payment.payment_id}
                      onClick={() => handleVerify(payment.payment_id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </Stack>
                </Box>
              </DashboardCard>
            ))
          )}
        </Stack>
      )}
    </AppShell>
  );
}
