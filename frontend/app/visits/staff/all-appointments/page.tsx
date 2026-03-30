"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type { AxiosError } from "axios";
import { AppShell, PageSkeleton, StatCard } from "@/app/components/app-shell";
import { SearchSettingsCard } from "@/app/components/search-settings-card";
import { PaginatedTableCard } from "@/app/components/paginated-table-card";
import { staffNav } from "@/app/components/navigation";
import api from "@/lib/api";
import { formatDate, formatTime, titleCase } from "@/lib/format";
import { getEffectiveRoles, type Profile } from "@/lib/access";

type ApiErrorResponse = { message?: string | string[] };

type Appointment = {
  appointment_id: number;
  status: string | null;
  approval_status?: string | null;
  patient_id?: number | null;
  child: { first_name: string | null; last_name: string | null } | null;
  booked_by: { parent: Array<{ first_name: string | null; last_name: string | null }> } | null;
  work_schedules: {
    work_date: string | null;
    start_time: string | null;
    end_time: string | null;
    staff: { first_name: string | null; last_name: string | null; role: string | null } | null;
  } | null;
};

type Visit = { visit_id: number; appointment_id: number | null };

const PAGE_SIZE = 8;

function isInRange(dateStr: string | null, range: string): boolean {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "day") return date >= startOfToday;
  if (range === "week") {
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 7);
    return date >= startOfToday && date <= end;
  }
  if (range === "month") {
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 30);
    return date >= startOfToday && date <= end;
  }
  return true;
}

export default function AllAppointmentsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);

  const visitMap = useMemo(
    () =>
      new Map(
        visits
          .filter((v) => v.appointment_id !== null)
          .map((v) => [v.appointment_id as number, v.visit_id]),
      ),
    [visits],
  );

  const filtered = useMemo(
    () =>
      appointments.filter((a) => {
        const matchText = `${a.child?.first_name ?? ""} ${a.child?.last_name ?? ""} ${a.booked_by?.parent?.[0]?.first_name ?? ""} ${a.booked_by?.parent?.[0]?.last_name ?? ""} ${a.work_schedules?.staff?.first_name ?? ""} ${a.work_schedules?.staff?.last_name ?? ""} ${a.status ?? ""} ${a.approval_status ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const workDate = a.work_schedules?.work_date?.slice(0, 10) ?? "";
        const matchDate = dateFilter ? workDate === dateFilter : isInRange(a.work_schedules?.work_date ?? null, range);
        return matchText && matchDate;
      }),
    [query, range, dateFilter, appointments],
  );

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: profileData }, { data: appointmentData }, { data: visitData }] =
        await Promise.all([
          api.get<Profile>("/auth/profile"),
          api.get<Appointment[]>("/appointments"),
          api.get<Visit[]>("/visit"),
        ]);
      setProfile(profileData);
      setAppointments(appointmentData);
      setVisits(visitData);
    } catch (err: unknown) {
      const e = err as AxiosError<ApiErrorResponse>;
      if (e.response?.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Unable to load appointments"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton />;

  return (
    <AppShell
      title="All Appointments"
      subtitle="รายการ appointment ทั้งหมด กดสร้างหรือเปิด visit record ได้เลย"
      navTitle="Clinic Ops"
      navItems={staffNav(profile)}
      badge="Visit"
      profileName={profile?.username}
      profileMeta={getEffectiveRoles(profile).join(", ") || "Clinic team"}
      actions={
        <Button variant="outlined" onClick={() => router.push("/visits/staff")}>
          Back to Visit Workspace
        </Button>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }} gap={2} mb={3}>
        <StatCard label="Total" value={appointments.length} helper="All appointments" />
        <StatCard label="Approved" value={appointments.filter((a) => a.approval_status === "approved").length} helper="Ready to create visit" />
        <StatCard label="With visit record" value={visitMap.size} helper="Already have a visit saved" />
      </Box>

      <SearchSettingsCard description="ระบุวันที่เจาะจง หรือเลือก range แล้วค้นหาตามชื่อ">
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "180px 180px minmax(0, 1fr)" }} gap={2}>
          <TextField
            select
            label="Range"
            value={range}
            disabled={Boolean(dateFilter)}
            onChange={(e) => { setRange(e.target.value); setPage(1); }}
            fullWidth
          >
            <MenuItem value="all">All appointments</MenuItem>
            <MenuItem value="day">Today</MenuItem>
            <MenuItem value="week">Next 7 days</MenuItem>
            <MenuItem value="month">Next 30 days</MenuItem>
          </TextField>
          <TextField
            label="Specific date"
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="Search appointments"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Child, parent, specialist, status"
            fullWidth
          />
        </Box>
      </SearchSettingsCard>

      <Box sx={{ mt: 2.5 }}>
        <PaginatedTableCard
          title="Appointment table"
          subtitle={`${filtered.length} appointment${filtered.length !== 1 ? "s" : ""} found`}
          page={page}
          pageCount={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}
          onPageChange={setPage}
          empty={filtered.length === 0}
          emptyLabel="No appointments match the current filters."
          header={
            <TableRow>
              <TableCell>Child</TableCell>
              <TableCell>Parent</TableCell>
              <TableCell>Specialist</TableCell>
              <TableCell>Date / Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          }
          body={
            <>
              {paged.map((appointment) => {
                const linkedVisitId = visitMap.get(appointment.appointment_id) ?? null;
                return (
                  <TableRow key={appointment.appointment_id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {appointment.child?.first_name || "-"} {appointment.child?.last_name || ""}
                    </TableCell>
                    <TableCell>
                      {appointment.booked_by?.parent?.[0]?.first_name || "-"}{" "}
                      {appointment.booked_by?.parent?.[0]?.last_name || ""}
                    </TableCell>
                    <TableCell>
                      {appointment.work_schedules?.staff?.first_name || "-"}{" "}
                      {appointment.work_schedules?.staff?.last_name || ""}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(appointment.work_schedules?.work_date || null)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(appointment.work_schedules?.start_time || null)} - {formatTime(appointment.work_schedules?.end_time || null)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Chip size="small" label={linkedVisitId ? "Visit saved" : titleCase(appointment.status)} color={linkedVisitId ? "success" : appointment.status === "cancelled" ? "error" : "default"} />
                        <Chip size="small" label={`Approval: ${titleCase(appointment.approval_status || "pending")}`} color={appointment.approval_status === "approved" ? "success" : appointment.approval_status === "rejected" ? "error" : "warning"} />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant={linkedVisitId ? "outlined" : "contained"}
                        disabled={appointment.status === "cancelled" || appointment.approval_status !== "approved"}
                        onClick={() => router.push(`/visits/staff?appointmentId=${appointment.appointment_id}`)}
                      >
                        {linkedVisitId ? "Open record" : appointment.approval_status === "approved" ? "Create visit" : "Waiting"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </>
          }
        />
      </Box>
    </AppShell>
  );
}
