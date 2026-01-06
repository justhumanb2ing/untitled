import DeleteAccountButton from "@/components/account/delete-account-button";
import { Button } from "@/components/ui/button";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

export default function UserProfileSettingRoute() {
  const navigate = useNavigate();

  return (
    <main className="h-full bg-background w-full flex flex-col py-8">
      <section className="mx-auto container max-w-7xl flex grow gap-4">
        <aside className="flex flex-col rounded-xl h-full gap-4 px-2">
          <header className="my-4 w-80">
            <div className="flex items-center gap-1">
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
          <div className="px-4">
            <ul className="flex flex-col gap-4">
              <li className="text-xl font-medium">Account</li>
              <li className="text-xl font-medium">Handle</li>
              <li className="text-xl font-medium">Customization</li>
              <li className="text-xl font-medium">Analytics</li>
            </ul>
          </div>
        </aside>
        <section className="rounded-xl h-full grow p-8">
          section
          <DeleteAccountButton />
        </section>
      </section>
    </main>
  );
}
