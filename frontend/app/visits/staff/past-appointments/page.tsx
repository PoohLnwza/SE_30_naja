"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  MenuItem,
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
import { formatDate } from "@/lib/format";
import { getEffectiveRoles, type Profile } from "@/lib/access";

type ApiErrorResponse = { message?: string | string[] };

type VisitRecord = {
  visit_id: number;
  appointment_id: number | null;
  visit_date: string | null;
  diagnoses: Array<{ diagnose_id: number; diagnosis_text: string | null }>;
  treatment_plans: Array<{ plan_id: number; plan_detail: string | null }>;
  prescriptions: Array<{ prescription_id: number; items: Array<{ prescription_item_id: number }> }>;
  appointment: {
    appointment_id: number;
    patient: { first_name: string | null; last_name: string | null } | null;
    booked_by?: { parent?: Array<{ first_name: string | null; last_name: string | null }> } | null;
  } | null;
};

const PAGE_SIZE = 8;

function isInRange(dateStr: string | null, range: string): boolean {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") return date >= startOfToday;
  if (range === "week") {
    const weekAgo = new Date(startOfToday);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  }
  if (range === "month") {
    const monthAgo = new Date(startOfToday);
    monthAgo.setDate(monthAgo.getDate() - 30);
    return date >= monthAgo;
  }
  return true;
}

export default function PastAppointmentsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      [...visits]
        .filter((v) => {
          const matchText = `${v.appointment?.patient?.first_name ?? ""} ${v.appointment?.patient?.last_name ?? ""} ${v.appointment?.booked_by?.parent?.[0]?.first_name ?? ""} ${v.appointment?.booked_by?.parent?.[0]?.last_name ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase());
          const visitDateStr = v.visit_date?.slice(0, 10) ?? "";
          const matchDate = dateFilter ? visitDateStr === dateFilter : isInRange(v.visit_date, range);
          return matchText && matchDate;
        })
        .sort((a, b) => {
          const at = a.visit_date ? new Date(a.visit_date).getTime() : 0;
          const bt = b.visit_date ? new Date(b.visit_date).getTime() : 0;
          return bt - at;
        }),
    [query, range, dateFilter, visits],
  );

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: profileData }, { data: visitData }] = await Promise.all([
        api.get<Profile>("/auth/profile"),
        api.get<VisitRecord[]>("/visit"),
      ]);
      setProfile(profileData);
      setVisits(visitData);
    } catch (err: unknown) {
      const e = err as AxiosError<ApiErrorResponse>;
      if (e.response?.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Unable to load visit records"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton />;

  return (
    <AppShell
      title="Past Appointments"
      subtitle="รายการ appointment ที่มี visit record แล้ว กดเพื่อเปิดและแก้ไขได้"
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
        <StatCard label="Total visit records" value={visits.length} helper="Appointments with saved visits" />
        <StatCard label="Showing" value={filtered.length} helper={query || range !== "all" ? "Matching filters" : "All records"} />
        <StatCard label="Diagnoses" value={visits.reduce((sum, v) => sum + v.diagnoses.length, 0)} helper="Total diagnosis entries" />
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
            <MenuItem value="all">All time</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">Last 7 days</MenuItem>
            <MenuItem value="month">Last 30 days</MenuItem>
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
            label="Search past appointments"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Child or parent name"
            fullWidth
          />
        </Box>
      </SearchSettingsCard>

      <Box sx={{ mt: 2.5 }}>
        <PaginatedTableCard
          title="Visit record table"
          subtitle={`${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
          page={page}
          pageCount={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}
          onPageChange={setPage}
          empty={filtered.length === 0}
          emptyLabel="No visit records match the current filters."
          header={
            <TableRow>
              <TableCell>Child</TableCell>
              <TableCell>Parent</TableCell>
              <TableCell>Visit date</TableCell>
              <TableCell>Diagnoses</TableCell>
              <TableCell>Medications</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          }
          body={
            <>
              {paged.map((visit) => (
                <TableRow key={visit.visit_id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {visit.appointment?.patient?.first_name || "-"}{" "}
                    {visit.appointment?.patient?.last_name || ""}
                  </TableCell>
                  <TableCell>
                    {visit.appointment?.booked_by?.parent?.[0]?.first_name || "-"}{" "}
                    {visit.appointment?.booked_by?.parent?.[0]?.last_name || ""}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(visit.visit_date)}</Typography>
                  </TableCell>
                  <TableCell>{visit.diagnoses.length}</TableCell>
                  <TableCell>{visit.prescriptions.flatMap((p) => p.items).length}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => router.push(`/visits/staff?appointmentId=${visit.appointment_id}`)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </>
          }
        />
      </Box>
    </AppShell>
  );
}
