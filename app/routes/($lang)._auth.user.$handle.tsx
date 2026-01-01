import { Outlet } from "react-router";

export default function UserLayout() {
  return (
    <main className="h-full flex justify-center items-center grow py-8">
      <Outlet />
    </main>
  );
}
