'use client';

import { useEffect, useMemo, useState } from 'react';
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
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { AppShell, StatCard } from '@/app/components/app-shell';
import { PaginatedTableCard } from '@/app/components/paginated-table-card';
import { SearchSettingsCard } from '@/app/components/search-settings-card';
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

const pageSize = 8;

export default function ParentPaymentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

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

      try {
        const { data: appointments } = await api.get<any[]>('/appointments');
        const invoicePromises = appointments
          .filter((appointment) => appointment.status === 'completed')
          .map(async (appointment) => {
            try {
              const { data: visit } = await api.get<any>(`/visit/appointment/${appointment.appointment_id}`);
              const { data: invoice } = await api.get<any>(`/invoice/visit/${visit.visit_id}`);
              return invoice;
            } catch {
              return null;
            }
          });
        const invoices = (await Promise.all(invoicePromises)).filter(Boolean);
        const unpaid = invoices.filter((invoice: any) => invoice && (!invoice.status || invoice.status === 'unpaid'));
        setUnpaidInvoices(unpaid);
      } catch {
        setUnpaidInvoices([]);
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
    void fetchData();
  }, []);

  const filteredInvoices = useMemo(
    () =>
      unpaidInvoices.filter((invoice) =>
        `${invoice.invoice_id} ${invoice.visit_id ?? ''} ${invoice.total_amount ?? ''} ${invoice.status ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, unpaidInvoices],
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
        const haystack = `${payment.payment_id} ${payment.invoice_id} ${payment.child_name ?? ''} ${payment.method} ${payment.status}`
          .toLowerCase();
        return matchesStatus && haystack.includes(query.toLowerCase());
      }),
    [payments, query, statusFilter],
  );

  const pagedInvoices = filteredInvoices.slice((invoicePage - 1) * pageSize, invoicePage * pageSize);
  const pagedPayments = filteredPayments.slice((paymentPage - 1) * pageSize, paymentPage * pageSize);

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
      await fetchData();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to submit payment';
      window.alert(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  return (
    <AppShell
      title="Payments"
      subtitle="Keep unpaid invoices and payment history in clean table sections so parents can find each billing row quickly."
      navTitle="Guardian Care"
      navItems={parentNav()}
      badge="Parent"
      profileName={profile?.username}
      profileMeta="Payment records"
      actions={
        <>
          <Button variant="outlined" onClick={() => router.push('/dashboard/parent')}>
            Dashboard
          </Button>
          <Button variant="contained" onClick={() => router.push('/visits/parent')}>
            Visit records
          </Button>
        </>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(4, 1fr)' }} gap={2} mb={3}>
        <StatCard label="Unpaid invoices" value={unpaidInvoices.length} helper="Invoices ready for payment" />
        <StatCard label="Total payments" value={payments.length} helper="Submitted payment rows" />
        <StatCard label="Confirmed" value={payments.filter((payment) => payment.status === 'confirmed').length} helper="Verified by staff" />
        <StatCard label="Pending" value={payments.filter((payment) => payment.status === 'pending').length} helper="Waiting for approval" />
      </Box>

      {loading ? (
        <Box display="grid" minHeight={320} sx={{ placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <SearchSettingsCard description="Use the filters once, then review unpaid invoices and payment history from the tables below.">
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'minmax(0, 1.5fr) 220px' }} gap={2}>
              <TextField
                label="Search invoices or payments"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setInvoicePage(1);
                  setPaymentPage(1);
                }}
                placeholder="Invoice id, child name, method, payment id"
                fullWidth
              />
              <TextField
                select
                label="Payment status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPaymentPage(1);
                }}
                fullWidth
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </TextField>
            </Box>
          </SearchSettingsCard>

          <Box sx={{ mt: 2.5 }}>
            <PaginatedTableCard
              title="Unpaid invoice table"
              subtitle="Use Pay now to open the payment dialog only for the invoice you selected."
              page={invoicePage}
              pageCount={Math.max(1, Math.ceil(filteredInvoices.length / pageSize))}
              onPageChange={setInvoicePage}
              empty={filteredInvoices.length === 0}
              emptyLabel="No unpaid invoices match the current search."
              header={
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Visit</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              }
              body={
                <>
                  {pagedInvoices.map((invoice) => (
                    <TableRow key={invoice.invoice_id} hover>
                      <TableCell>#{invoice.invoice_id}</TableCell>
                      <TableCell>{invoice.visit_id ? `#${invoice.visit_id}` : '-'}</TableCell>
                      <TableCell align="right">{formatMoney(Number(invoice.total_amount ?? 0))}</TableCell>
                      <TableCell>
                        <Chip label={invoice.status || 'unpaid'} size="small" color="warning" />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="contained" onClick={() => handleOpenPay(invoice)}>
                          Pay now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              }
            />
          </Box>

          <Box sx={{ mt: 2.5 }}>
            <PaginatedTableCard
              title="Payment history table"
              subtitle="Track each submitted payment without stacking long cards down the page."
              page={paymentPage}
              pageCount={Math.max(1, Math.ceil(filteredPayments.length / pageSize))}
              onPageChange={setPaymentPage}
              empty={filteredPayments.length === 0}
              emptyLabel="No payments match the current filters."
              header={
                <TableRow>
                  <TableCell>Payment ID</TableCell>
                  <TableCell>Child</TableCell>
                  <TableCell>Invoice</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Slip</TableCell>
                </TableRow>
              }
              body={
                <>
                  {pagedPayments.map((payment) => (
                    <TableRow key={payment.payment_id} hover>
                      <TableCell>#{payment.payment_id}</TableCell>
                      <TableCell>{payment.child_name || '-'}</TableCell>
                      <TableCell>#{payment.invoice_id}</TableCell>
                      <TableCell align="right">{formatMoney(Number(payment.amount))}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>
                        <Chip label={statusLabel(payment.status)} size="small" color={statusColor(payment.status)} />
                      </TableCell>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell>{payment.slip_image ? 'Uploaded' : '-'}</TableCell>
                    </TableRow>
                  ))}
                </>
              }
            />
          </Box>
        </>
      )}

      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment - Invoice #{selectedInvoice?.invoice_id}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="h4" textAlign="center">
              {formatMoney(Number(selectedInvoice?.total_amount ?? 0))}
            </Typography>

            <Box textAlign="center" sx={{ mt: 3 }}>
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
              onChange={(event) => setSlipImage(event.target.value)}
              fullWidth
              sx={{ mt: 3 }}
            />
          </Box>
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
