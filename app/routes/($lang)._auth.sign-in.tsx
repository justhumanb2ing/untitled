import { Button } from "@/components/ui/button";
import { SignIn } from "@clerk/react-router";
import { XIcon } from "@phosphor-icons/react";
import { useNavigate, useParams } from "react-router";

export default function SignInRoute() {
  const { lang } = useParams();
  const signInPath = lang ? `/${lang}/sign-in` : "/sign-in";
  const signUpUrl = lang ? `/${lang}/sign-up` : "/sign-up";
  const navigate = useNavigate();

  return (
    <main className="grow flex flex-col justify-center items-center h-full relative">
      <header className="fixed top-5 left-5">
        <Button
          variant={"ghost"}
          size={"icon-lg"}
          className={"rounded-full p-6"}
          onClick={() => navigate(-1)}
        >
          <XIcon className="size-6" weight="bold" />
        </Button>
      </header>
      <SignIn path={signInPath} signUpUrl={signUpUrl} withSignUp />
    </main>
  );
}
