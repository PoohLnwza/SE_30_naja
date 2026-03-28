'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AppShell, DashboardCard, StatCard } from '@/app/components/app-shell';
import { parentNav } from '@/app/components/navigation';
import api from '@/lib/api';
import type { Profile } from '@/lib/access';
import { formatDate, formatMoney } from '@/lib/format';

type Payment = {
  payment_id: number;
  invoice_id: number;
  amount: string;
  method: string;
  status: string;
  slip_image: string | null;
  payment_date: string;
  invoice_total: string | null;
  child_name: string | null;
};

type Invoice = {
  invoice_id: number;
  visit_id: number | null;
  total_amount: string | null;
  status: string;
};

export default function ParentPaymentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pay dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [slipImage, setSlipImage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: profileData }, { data: paymentData }] = await Promise.all([
        api.get<Profile>('/auth/profile'),
        api.get<Payment[]>('/payment/my-payments'),
      ]);
      setProfile(profileData);
      setPayments(paymentData);

      // Find unpaid invoices from appointments
      try {
        const { data: appointments } = await api.get<any[]>('/appointments');
        const invoicePromises = appointments
          .filter((a) => a.status === 'completed')
          .map(async (a) => {
            try {
              const { data: visit } = await api.get<any>(`/visit/appointment/${a.appointment_id}`);
              const { data: invoice } = await api.get<any>(`/invoice/visit/${visit.visit_id}`);
              return invoice;
            } catch {
              return null;
            }
          });
        const invoices = (await Promise.all(invoicePromises)).filter(Boolean);
        const unpaid = invoices.filter(
          (inv: any) => inv && (!inv.status || inv.status === 'unpaid'),
        );
        setUnpaidInvoices(unpaid);
      } catch {
        // invoices are optional, don't block the page
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to load payments';
      setError(Array.isArray(message) ? message.join(', ') : message);
      if (err?.response?.status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenPay = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSlipImage('');
    setPayDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedInvoice) return;
    setSubmitting(true);
    try {
      await api.post('/payment', {
        invoiceId: selectedInvoice.invoice_id,
        slipImage: slipImage || undefined,
      });
      setPayDialogOpen(false);
      fetchData();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to submit payment';
      window.alert(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  };

  return (
    <AppShell
      title="Payments"
      subtitle="View your invoices, scan QR code to pay, and track payment status."
      navTitle="Guardian Care"
      navItems={parentNav()}
      badge="Parent"
      profileName={profile?.username}
      profileMeta="Payment records"
      actions={
        <Button variant="outlined" onClick={() => router.push('/dashboard/parent')}>
          Dashboard
        </Button>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={2} mb={3}>
        <StatCard label="Total payments" value={payments.length} />
        <StatCard label="Confirmed" value={payments.filter((p) => p.status === 'confirmed').length} />
        <StatCard label="Pending" value={payments.filter((p) => p.status === 'pending').length} />
      </Box>

      {loading ? (
        <Box display="grid" minHeight={320} sx={{ placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {/* Unpaid invoices */}
          {unpaidInvoices.length > 0 && (
            <>
              <Typography variant="h5">Unpaid Invoices</Typography>
              {unpaidInvoices.map((invoice) => (
                <DashboardCard key={invoice.invoice_id}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                    <Box>
                      <Typography variant="h6">Invoice #{invoice.invoice_id}</Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Amount: {formatMoney(Number(invoice.total_amount ?? 0))}
                      </Typography>
                    </Box>
                    <Button variant="contained" color="primary" onClick={() => handleOpenPay(invoice)}>
                      Pay now
                    </Button>
                  </Box>
                </DashboardCard>
              ))}
            </>
          )}

          {/* Payment history */}
          <Typography variant="h5">Payment History</Typography>
          {payments.length === 0 ? (
            <DashboardCard>
              <Typography variant="h6">No payments yet</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                When you make a payment, it will appear here.
              </Typography>
            </DashboardCard>
          ) : (
            payments.map((payment) => (
              <DashboardCard key={payment.payment_id}>
                <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
                  <Box>
                    <Typography variant="h6">
                      {payment.child_name || 'Unknown'} — Invoice #{payment.invoice_id}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Amount: {formatMoney(Number(payment.amount))}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Date: {formatDate(payment.payment_date)}
                    </Typography>
                    {payment.slip_image && (
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Slip: Uploaded
                      </Typography>
                    )}
                  </Box>
                  <Chip label={statusLabel(payment.status)} color={statusColor(payment.status)} />
                </Box>
              </DashboardCard>
            ))
          )}
        </Stack>
      )}

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment — Invoice #{selectedInvoice?.invoice_id}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="h4" textAlign="center">
              {formatMoney(Number(selectedInvoice?.total_amount ?? 0))}
            </Typography>

            {/* QR Code */}
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary" mb={1}>
                Scan QR Code to pay
              </Typography>
              <Box
                component="img"
                src="/qr-payment.png"
                alt="Payment QR Code"
                sx={{ maxWidth: 250, width: '100%', mx: 'auto', borderRadius: 2 }}
              />
            </Box>

            <TextField
              label="Slip image URL (optional)"
              placeholder="Paste slip image URL after transfer"
              value={slipImage}
              onChange={(e) => setSlipImage(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitPayment} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Confirm payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
