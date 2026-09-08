import { createFileRoute } from "@tanstack/react-router";
import { DeskShell } from "@/components/desk/desk-shell";

export const Route = createFileRoute("/_desk")({
  component: DeskShell,
});
