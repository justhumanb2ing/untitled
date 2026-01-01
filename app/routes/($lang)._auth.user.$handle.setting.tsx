import { Button } from "@/components/ui/button";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

export default function UserProfileSettingRoute() {
  const navigate = useNavigate();

  return (
    <main className="h-full bg-background w-full flex flex-col items-center">
      <section className="w-7xl">
        <header className="h-12 py-8">
          <div className="flex items-center gap-2">
            <Button
              size={"icon-lg"}
              variant={"ghost"}
              className={"size-12"}
              onClick={() => navigate(-1)}
            >
              <CaretLeftIcon weight="bold" className="size-8" />
            </Button>
            <h1 className="font-bold text-3xl">Setting</h1>
          </div>
        </header>
      </section>

      {/* Delete Account */}
      <section>Delete Account</section>
      
      {/* Customization Tab */}
      <section>Customization Tab</section>

      {/* Analytics Tab */}
      <section>Analytics Tab</section>

      {/* Add another handle */}
      <section>Add another handle</section>
    </main>
  );
}
