"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { AppShell, DashboardCard } from "@/app/components/app-shell";
import { staffNav } from "@/app/components/navigation";
import api from "@/lib/api";
import type { Profile } from "@/lib/access";

export default function NewSchedulePage() {
  const router = useRouter();
  const [profile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    work_date: "",
    start_time: "",
    end_time: "",
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/appointments/schedules", form);
      router.push("/appointments/staff/schedules");
    } catch (err: any) {
      const message = err?.response?.data?.message || "Unable to create schedule";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Create Schedule"
      subtitle="Creation stays on its own page so the main schedule list can remain a clean table."
      navTitle="Clinic Ops"
      navItems={staffNav(profile)}
      badge="Create"
      actions={
        <Button variant="outlined" onClick={() => router.push("/appointments/staff/schedules")}>
          Back to schedules
        </Button>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <DashboardCard>
        <Typography variant="h5">New schedule slot</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2.25 }}>
          <Stack spacing={2}>
            <TextField label="Work date" type="date" value={form.work_date} onChange={(event) => setForm((prev) => ({ ...prev, work_date: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} required />
            <TextField label="Start time" type="time" value={form.start_time} onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} required />
            <TextField label="End time" type="time" value={form.end_time} onChange={(event) => setForm((prev) => ({ ...prev, end_time: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} required />
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Creating..." : "Create schedule"}
            </Button>
          </Stack>
        </Box>
      </DashboardCard>
    </AppShell>
  );
}
