import { redirect } from "next/navigation";

/** Entrar solo con nombre fue eliminado. */
export default function EntrarRedirectPage() {
  redirect("/login");
}
