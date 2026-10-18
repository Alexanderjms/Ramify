"use server";

import { signOut } from "@/auth";
import { redirect } from "next/navigation";

export async function logout() {
  if (process.env.AUTH_SECRET)
    await signOut({ redirect: false, redirectTo: "/login" });
  redirect("/login");
}
