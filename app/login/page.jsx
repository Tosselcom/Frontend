"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ArrowRight } from "lucide-react"
import axios from "axios"
import AuthLeftPanel from "@/components/auth/auth-left-panel"
import { discoverApiBaseUrl, getApiUrl } from "@/lib/api"
export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  const pushNotification = (message, type = "info") => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current))
    }, 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await Promise.race([
        discoverApiBaseUrl(),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ])
      const response = await axios.post(
        getApiUrl("/user/auth/login"),
        formData,
        { timeout: 8000 }
      )

      if (response.status === 200) {
        // backend sends { token, user }
        const { token, user } = response.data
        sessionStorage.setItem("token", token)
        if (user) {
          const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
          sessionStorage.setItem(
            "user",
            JSON.stringify({
              id: user.id,
              name: fullName || user.email,
              email: user.email,
              role: "shared",
            })
          )
        }
        pushNotification("Login successful", "success")
        setTimeout(() => {
          router.push("/dashboard")
        }, 450)
      } else {
        console.error("Login failed:", response.data)
        pushNotification("Login failed: " + (response.data.message || "Unknown error"), "error")
      }
    } catch (err) {
      console.error("Login error", err)
      pushNotification(
        err.code === "ECONNABORTED"
          ? "Login request timed out. Please try again."
          : (err.response?.data?.message || "Login failed; check console"),
        "error"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <AuthLeftPanel />

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:ml-[41.666667vw] lg:px-16 xl:px-24 bg-background">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo */}
          <div className="-mt-6 mb-2 lg:hidden flex justify-center">
          <img src="/logo white.svg" alt="FI TRi9i" className="w-56" />
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 pr-12 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
              />
              <label htmlFor="remember" className="text-sm text-muted-foreground">Remember me for 30 days</label>
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
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or continue with</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 py-3 text-sm font-medium text-card-foreground hover:bg-muted transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 py-3 text-sm font-medium text-card-foreground hover:bg-muted transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link href="/signup" className="font-semibold text-accent hover:text-accent/80 transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>

      {notification && (
        <div className="fixed right-4 top-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${notification.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
          >
            {notification.message}
          </div>
        </div>
      )}
    </div>
  )
}
