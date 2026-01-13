import { Resend } from "resend";
import z from "zod";
import { useFetcher } from "react-router";
import Logo from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Route } from "./+types/($lang).feedback";

const resend = new Resend(process.env.RESEND_API_KEY);

const emailSchema = z.object({
  senderEmail: z.email(),
  subject: z.string().trim().min(1, "Subject is required."),
  content: z.string().trim().min(1, "Content is required."),
});

type FieldErrors = Partial<
  Record<"senderEmail" | "subject" | "content", string>
>;

type ActionData =
  | { ok: true; message: string }
  | { ok: false; fieldErrors?: FieldErrors; formError?: string };

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const parsed = emailSchema.safeParse({
    senderEmail: formData.get("senderEmail")?.toString().trim(),
    subject: formData.get("subject")?.toString().trim(),
    content: formData.get("content")?.toString().trim(),
  });

  // 1) Validation error → 400 + fieldErrors
  if (!parsed.success) {
    const tree = z.treeifyError(parsed.error);

    const data = {
      ok: false,
      fieldErrors: {
        senderEmail: tree.properties?.senderEmail?.errors[0],
        subject: tree.properties?.subject?.errors[0],
        content: tree.properties?.content?.errors[0],
      },
    } satisfies ActionData;

    return Response.json(data, { status: 400 });
  }

  const { senderEmail, subject, content } = parsed.data;

  try {
    await resend.emails.send({
      from: `delivered@resend.dev`, // TODO: 검증된 도메인의 발신 주소이다. 사용자의 이메일 주소가 아님 e.g. 앱이름 <no-reply.서브도메인>
      to: "zentechie7@gmail.com", // TODO: 전달받을 나의 이메일 주소
      replyTo: senderEmail, // 사용자의 이메일 주소 -> 사용자가 회신받는 메일 주소임
      subject,
      text: content,
      headers: {
        "X-Source": "feedback/issue",
      },
    });

    const data = {
      ok: true,
      message: "메일을 전송했어요.",
    } satisfies ActionData;
    console.log(data);
    return Response.json(data, { status: 200 });
  } catch (err) {
    console.error("Email send failed:", err);

    const data = {
      ok: false,
      formError: "메일 전송에 실패했어요. 잠시 후 다시 시도해주세요.",
    } satisfies ActionData;

    return Response.json(data, { status: 502 });
  }
}

export default function IssueRoute() {
  const fetcher = useFetcher<ActionData>();
  const isSubmitting = fetcher.state !== "idle";
  const actionData = fetcher.state === "idle" ? fetcher.data : undefined;
  const fieldErrors =
    actionData?.ok === false ? actionData.fieldErrors : undefined;
  const formError = actionData?.ok === false ? actionData.formError : undefined;
  const senderEmailErrors = fieldErrors?.senderEmail
    ? [{ message: fieldErrors.senderEmail }]
    : undefined;
  const subjectErrors = fieldErrors?.subject
    ? [{ message: fieldErrors.subject }]
    : undefined;
  const contentErrors = fieldErrors?.content
    ? [{ message: fieldErrors.content }]
    : undefined;

  return (
    <main className="h-full container mx-auto max-w-2xl flex flex-col gap-6 p-8">
      <header className="font-medium text-xl">
        Report an issue or share product feedback.
      </header>
      <section className="grow flex flex-col relative">
        <fetcher.Form
          method="post"
          noValidate
          className="w-full max-w-full flex flex-col gap-6"
        >
          {formError ? (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          ) : null}
          <FieldSet className="gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="senderEmail">Email (optional)</FieldLabel>
                <FieldContent>
                  <Input
                    id="senderEmail"
                    name="senderEmail"
                    type="email"
                    autoComplete="off"
                    placeholder="Enter your email only if you’d like a reply."
                    aria-invalid={!!fieldErrors?.senderEmail}
                    aria-describedby={
                      fieldErrors?.senderEmail ? "senderEmail-error" : undefined
                    }
                  />
                  <FieldError
                    id="senderEmail-error"
                    errors={senderEmailErrors}
                  />
                </FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="subject" className="gap-1">
                Subject<span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="subject"
                  name="subject"
                  autoComplete="off"
                  placeholder="Brief summary"
                  aria-invalid={!!fieldErrors?.subject}
                  aria-describedby={
                    fieldErrors?.subject ? "subject-error" : undefined
                  }
                />
                <FieldError id="subject-error" errors={subjectErrors} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="content" className="gap-1">
                Message<span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="content"
                  name="content"
                  autoComplete="off"
                  placeholder="Tell us what happened or what you would love to see."
                  className="min-h-32"
                  aria-invalid={!!fieldErrors?.content}
                  aria-describedby={
                    fieldErrors?.content ? "content-error" : undefined
                  }
                />
                <FieldError id="content-error" errors={contentErrors} />
              </FieldContent>
            </Field>
          </FieldSet>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs/relaxed text-muted-foreground">
              Responses are not guaranteed.
            </p>
            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="min-w-32"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              data-icon={isSubmitting ? "inline-start" : undefined}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Sending...
                </>
              ) : (
                "Send feedback"
              )}
            </Button>
          </div>
        </fetcher.Form>
        <div className="absolute top-0 left-0 h-full w-full bg-muted/50 flex items-center justify-center font-medium text-xs/relaxed">
          Unavailable
        </div>
      </section>
    </main>
  );
}
