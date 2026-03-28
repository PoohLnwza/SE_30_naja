"use client";

import { Box, Button, CircularProgress, TableCell, TableRow, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, StatCard } from "@/app/components/app-shell";
import { staffNav } from "@/app/components/navigation";
import { PaginatedTableCard } from "@/app/components/paginated-table-card";
import { SearchSettingsCard } from "@/app/components/search-settings-card";
import api from "@/lib/api";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import type { Profile } from "@/lib/access";

type VisitRecord = {
  visit_id: number;
  appointment_id: number | null;
  visit_date: string | null;
  appointment: {
    patient: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    booked_by?: {
      parent?: Array<{
        first_name: string | null;
        last_name: string | null;
      }>;
    } | null;
    schedule: {
      staff: {
        first_name: string | null;
        last_name: string | null;
        role: string | null;
      } | null;
    } | null;
  } | null;
  prescriptions: Array<{ items: Array<unknown> }>;
  invoices: Array<{
    invoice_id: number;
    total_amount: string | number | null;
    items?: Array<unknown>;
  }>;
};

export default function StaffVisitsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      const [{ data: profileData }, { data: visitData }] = await Promise.all([
        api.get<Profile>("/auth/profile"),
        api.get<VisitRecord[]>("/visit"),
      ]);
      setProfile(profileData);
      setVisits(visitData);
      setLoading(false);
    };
    load();
  }, []);

  const filteredVisits = useMemo(
    () =>
      visits.filter((visit) =>
        `${visit.appointment?.patient?.first_name ?? ""} ${visit.appointment?.patient?.last_name ?? ""} ${visit.appointment?.booked_by?.parent?.[0]?.first_name ?? ""} ${visit.appointment?.booked_by?.parent?.[0]?.last_name ?? ""} ${visit.appointment?.schedule?.staff?.first_name ?? ""} ${visit.appointment?.schedule?.staff?.last_name ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, visits],
  );
  const pageSize = 10;
  const pagedVisits = useMemo(
    () => filteredVisits.slice((page - 1) * pageSize, page * pageSize),
    [filteredVisits, page],
  );

  if (loading) {
    return (
      <Box minHeight="100vh" display="grid" sx={{ placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AppShell
      title="Visit Records"
      subtitle="The list page stays as a table. Creating and editing happens in a separate editor screen."
      navTitle="Clinic Ops"
      navItems={staffNav(profile)}
      badge="Visits"
      profileName={profile?.username}
      profileMeta="Visit records"
      actions={
        <>
          <Button variant="outlined" onClick={() => router.push("/appointments/staff")}>
            Appointment table
          </Button>
          <Button variant="contained" onClick={() => router.push("/visits/staff/editor")}>
            Create visit record
          </Button>
        </>
      }
    >
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }} gap={2} mb={3}>
        <StatCard label="Visits" value={visits.length} helper="Saved records" />
        <StatCard label="Prescriptions" value={visits.reduce((sum, visit) => sum + visit.prescriptions.flatMap((item) => item.items).length, 0)} helper="Medication lines" />
        <StatCard label="Invoices" value={visits.filter((visit) => visit.invoices.length > 0).length} helper="Linked billing" />
      </Box>

      <SearchSettingsCard description="Search the visit table, then open the editor only for the specific row you want to work on.">
        <Box display="grid" gridTemplateColumns={{ xs: "1fr" }} gap={1.5}>
          <Button variant="text" sx={{ justifyContent: "flex-start", px: 0 }} onClick={() => router.push("/appointments/staff")}>
            Go to appointments to create from approved booking
          </Button>
          <TextField
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            label="Search visits"
            placeholder="Search child, parent, specialist"
          />
        </Box>
      </SearchSettingsCard>

      <Box sx={{ mt: 2.5 }}>
        <PaginatedTableCard
          title="Visit table"
          subtitle="Keep the table compact, then open the row you want to inspect in more detail."
          page={page}
          pageCount={Math.ceil(filteredVisits.length / pageSize)}
          onPageChange={setPage}
          empty={filteredVisits.length === 0}
          header={
            <TableRow>
              <TableCell>Visit ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Child</TableCell>
              <TableCell>Prescription</TableCell>
              <TableCell>Invoice</TableCell>
              <TableCell>Specialist</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          }
          body={
            <>
              {pagedVisits.map((visit) => (
                <TableRow key={visit.visit_id} hover>
                  <TableCell>#{visit.visit_id}</TableCell>
                  <TableCell>{formatDate(visit.visit_date)}</TableCell>
                  <TableCell>{visit.appointment?.patient?.first_name || "-"} {visit.appointment?.patient?.last_name || ""}</TableCell>
                  <TableCell>
                    {visit.prescriptions.length > 0
                      ? `${visit.prescriptions.flatMap((item) => item.items).length} item(s)`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {visit.invoices[0]
                      ? `#${visit.invoices[0].invoice_id} • ${formatMoney(visit.invoices[0].total_amount)}`
                      : "-"}
                  </TableCell>
                  <TableCell>{visit.appointment?.schedule?.staff?.first_name || "-"} {visit.appointment?.schedule?.staff?.last_name || ""} {visit.appointment?.schedule?.staff?.role ? `(${titleCase(visit.appointment.schedule.staff.role)})` : ""}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Button variant="outlined" onClick={() => router.push(`/visits/staff/editor?appointmentId=${visit.appointment_id ?? ""}`)}>
                        View
                      </Button>
                      <Button variant="contained" onClick={() => router.push(`/visits/staff/editor?appointmentId=${visit.appointment_id ?? ""}`)}>
                        Open editor
                      </Button>
                    </Box>
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
