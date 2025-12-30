import { SignIn } from "@clerk/react-router";
import { useParams } from "react-router";

export default function SignInRoute() {
  const { lang } = useParams();
  const signInPath = lang ? `/${lang}/sign-in` : "/sign-in";
  const signUpUrl = lang ? `/${lang}/sign-up` : "/sign-up";

  return (
    <main>
      <SignIn
        path={signInPath}
        signUpUrl={signUpUrl}
        withSignUp
      />
    </main>
  );
}
