import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  loginSchema,
  otpSchema,
  type LoginFormData,
  type OtpFormData,
} from "../auth.schema"
import { OTP_RESEND_COOLDOWN_SECONDS } from "../auth.constants"
import { useRequestOtp } from "../hooks/useRequestOtp"
import { useVerifyOtp } from "../hooks/useVerifyOtp"
import type { AuthUser } from "../auth.types"

type LoginFormProps = {
  eyebrow: string
  onVerified: (user: AuthUser) => void
}

export function LoginForm({ eyebrow, onVerified }: LoginFormProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [cooldown, setCooldown] = useState(0)

  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()

  const emailForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  })

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const sendCode = (targetEmail: string) => {
    requestOtp.mutate(
      { email: targetEmail },
      {
        onSuccess: () => {
          setEmail(targetEmail)
          setStep("otp")
          setCooldown(OTP_RESEND_COOLDOWN_SECONDS)
          otpForm.reset({ otp: "" })
        },
      }
    )
  }

  const onSubmitEmail = emailForm.handleSubmit((values) => {
    sendCode(values.email)
  })

  const onSubmitOtp = otpForm.handleSubmit((values) => {
    verifyOtp.mutate(
      { email, token: values.otp },
      {
        onSuccess: onVerified,
      }
    )
  })

  const requestError = requestOtp.error
  const verifyError = verifyOtp.error

  return (
    <div className="border-border bg-card mx-auto mt-16 max-w-[430px] rounded-[20px] border p-8">
      <span className="text-primary text-xs font-bold tracking-[2px] uppercase">
        {eyebrow}
      </span>
      <h1 className="text-foreground mt-3 text-2xl font-semibold">{t("auth.heading")}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {step === "email" ? t("auth.subheading") : t("auth.codeSentTo", { email })}
      </p>

      {step === "email" ? (
        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => void onSubmitEmail(event)}
          noValidate
        >
          <div>
            <Label htmlFor="email">{t("fields.workEmail")}</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder={t("fields.workEmailPlaceholder")}
              className="mt-1.5"
              {...emailForm.register("email")}
            />
            {emailForm.formState.errors.email && (
              <p className="text-destructive mt-1.5 text-xs">
                {t(emailForm.formState.errors.email.message ?? "serverErrors.default")}
              </p>
            )}
          </div>
          {requestError && (
            <p className="text-destructive text-xs" role="alert">
              {t(`serverErrors.${requestError.code}`, {
                defaultValue: t("serverErrors.default"),
              })}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={requestOtp.isPending}>
            {t("auth.sendCode")}
          </Button>
        </form>
      ) : (
        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => void onSubmitOtp(event)}
          noValidate
        >
          <div>
            <Label htmlFor="otp">{t("fields.verificationCode")}</Label>
            <Input
              id="otp"
              type="text"
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("fields.verificationCodePlaceholder")}
              className="mt-1.5"
              {...otpForm.register("otp")}
            />
            {otpForm.formState.errors.otp && (
              <p className="text-destructive mt-1.5 text-xs">
                {t(otpForm.formState.errors.otp.message ?? "serverErrors.default")}
              </p>
            )}
          </div>
          {verifyError && (
            <p className="text-destructive text-xs" role="alert">
              {t(`serverErrors.${verifyError.code}`, {
                defaultValue: t("serverErrors.default"),
              })}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={verifyOtp.isPending}>
            {t("auth.verifyCode")}
          </Button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setStep("email")
                setCooldown(0)
              }}
            >
              {t("auth.useAnotherEmail")}
            </button>
            <button
              type="button"
              className="text-primary disabled:text-muted-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:no-underline"
              disabled={cooldown > 0 || requestOtp.isPending}
              onClick={() => sendCode(email)}
            >
              {cooldown > 0
                ? t("auth.resendCodeIn", { seconds: cooldown })
                : t("auth.resendCode")}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
