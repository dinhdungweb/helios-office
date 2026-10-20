import type { Route } from "next";
import { redirect } from "next/navigation";

export default function NewEmployeePage() {
  redirect("/apps/personnel-profile-profile/add" as Route);
}
