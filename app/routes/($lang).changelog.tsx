import Logo from "@/components/layout/logo";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ChangeLogRoute() {
  return (
    <main className="h-full max-w-2xl container mx-auto flex flex-col gap-6 p-8">
      <header>
        <Logo />
      </header>
      <section className="grow rounded-lg border-2 border-dotted">
        <Empty className="h-full">
          <EmptyHeader>
            <EmptyTitle>Changelog</EmptyTitle>
            <EmptyDescription>
              Everything remains the same for the time being.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    </main>
  );
}
