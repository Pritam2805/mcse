import { redirect } from "next/navigation";

export default function PositionsPage() {
  redirect("/portfolio?tab=orders");
}
