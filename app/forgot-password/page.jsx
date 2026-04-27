"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from "axios"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import AuthLeftPanel from "@/components/auth/auth-left-panel"
import { getApiUrl } from "@/lib/api"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const clearFeedback = () => {
    setMessage("")
    setError("")
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    clearFeedback()
    setIsLoading(true)

    try {
      const response = await axios.post(getApiUrl("/user/auth/forgot-password"), { email })
      setMessage(response.data?.message || "Reset code sent to your email")
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    clearFeedback()
    setIsLoading(true)

    try {
      const response = await axios.post(getApiUrl("/user/auth/verify-reset-code"), { email, code })
      setMessage(response.data?.message || "Code verified successfully")
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    clearFeedback()

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const response = await axios.post(getApiUrl("/user/auth/reset-password"), {
        email,
        code,
        newPassword,
      })

      setMessage(response.data?.message || "Password reset successfully")
      setTimeout(() => {
        router.push("/login")
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <AuthLeftPanel />

      <div className="flex flex-1 flex-col justify-center px-5 sm:px-6 py-10 sm:py-12 xl:ml-[50vw] lg:px-12 xl:px-20 2xl:px-24 bg-background">
        <div className="mx-auto w-full max-w-md">
          <div className="-mt-6 mb-2 lg:hidden flex justify-center">
            <img src="/logo white.svg" alt="FI TRi9i" className="w-56" />
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Forgot your password?</h2>
            <p className="mt-2 text-muted-foreground">Follow the steps below to secure your account.</p>
          </div>

          <div className="mb-6 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <span className={step >= 1 ? "text-primary" : ""}>1. Email</span>
            <span>/</span>
            <span className={step >= 2 ? "text-primary" : ""}>2. Code</span>
            <span>/</span>
            <span className={step >= 3 ? "text-primary" : ""}>3. New Password</span>
          </div>

          {message && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="you@company.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Send reset code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-foreground mb-1.5">
                  6-digit code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm tracking-[0.35em] text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Verify code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-1.5">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Min. 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Reset password
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-accent hover:text-accent/80 transition-colors">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
