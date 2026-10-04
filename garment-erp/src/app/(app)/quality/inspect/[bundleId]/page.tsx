import { redirect } from "next/navigation";

// v1 bundle-based inspect page is no longer used.
// Redirect to the new defect recording flow.
export default function InspectRedirect() {
  redirect("/quality/new");
}
