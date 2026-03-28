import type { Profile } from "@/lib/access";
import type { NavItem } from "./app-shell";

export function parentNav(): NavItem[] {
  return [
    { label: "Dashboard", href: "/dashboard/parent" },
    { label: "Book Appointment", href: "/appointments/parent" },
    { label: "Assessments", href: "/assessments/parent" },
    { label: "Visit Records", href: "/visits/parent" },
    { label: "History", href: "/appointments/parent/history" },
    { label: "Payments", href: "/payment/parent" },
    { label: "Profile", href: "/profile" },
  ];
}

export function staffNav(profile: Profile | null): NavItem[] {
  const items: NavItem[] = [
    { label: "Overview", href: "/dashboard/staff" },
    { label: "Appointments", href: "/appointments/staff" },
    { label: "Visit Records", href: "/visits/staff" },
    { label: "Assessments", href: "/assessments/staff" },
    { label: "Payments", href: "/payment/staff" },
    { label: "Management", href: "/dashboard/staff/management" },
  ];

  items.push({ label: "Profile", href: "/profile" });

  return dedupeNav(items);
}

function dedupeNav(items: NavItem[]) {
  const map = new Map<string, NavItem>();
  items.forEach((item) => map.set(item.href, item));
  return Array.from(map.values());
}
