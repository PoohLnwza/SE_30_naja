import { redirect } from "next/navigation";

export default async function StaffVisitsEditorPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const appointmentId = Array.isArray(params.appointmentId)
    ? params.appointmentId[0]
    : params.appointmentId;

  redirect(
    appointmentId ? `/visits/staff?appointmentId=${appointmentId}` : "/visits/staff",
  );
}
