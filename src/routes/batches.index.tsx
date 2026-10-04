import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/batches/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
