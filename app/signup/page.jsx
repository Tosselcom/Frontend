"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ArrowRight } from "lucide-react"
import axios from "axios"
import { Country, City } from "country-state-city"
import AuthLeftPanel from "@/components/auth/auth-left-panel"
import { discoverApiBaseUrl, getApiUrl } from "@/lib/api"

export default function SignupPage() {
  const router = useRouter()
  const countryOptions = useMemo(() => Country.getAllCountries(), [])
  const [countryCode, setCountryCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    city: "",
    country: "",
    age: "",
    password: "",
  })

  const cityOptions = useMemo(() => {
    if (!countryCode) return []
    return City.getCitiesOfCountry(countryCode) || []
  }, [countryCode])

  useEffect(() => {
    if (!countryCode) {
      setFormData((prev) => ({ ...prev, city: "" }))
    }
  }, [countryCode])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const selectedCountry = countryOptions.find((country) => country.isoCode === countryCode)
    if (!selectedCountry) {
      alert("Please select a valid country")
      return
    }

    const selectedCity = cityOptions.find((city) => city.name === formData.city)
    if (!selectedCity) {
      alert("Please select a valid city")
      return
    }

    setIsLoading(true)
    try {
      await discoverApiBaseUrl()
      const response = await axios.post(
        getApiUrl("/user/auth/register"),
        {
          ...formData,
          country: selectedCountry.name,
          city: selectedCity.name,
        }
      )

      if (response.status === 200) {
        router.replace("/login")
      } else {
        console.error("Registration failed:", response.data)
        alert("Registration failed: " + (response.data.message || "Unknown error"))
      }
    } catch (err) {
      console.error("Signup error", err)
      alert(
        err.response?.data?.message || "Registration failed; check console"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen xl:h-screen xl:overflow-hidden">
      <AuthLeftPanel />

      {/* Right Panel - Signup Form */}
      <div className="flex flex-1 flex-col justify-center px-5 sm:px-6 py-10 sm:py-12 xl:ml-[50vw] lg:px-12 xl:px-16 2xl:px-20 bg-background">
        <div className="mx-auto w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="-mt-6 mb-2 flex justify-center lg:hidden">
            
            <img src="/logo white.svg" alt="FI TRI9I" className="w-56" />
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Create your account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1.5">First name</label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Meftah"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1.5">Last name</label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Reda"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1.5">City</label>
                  <select
                    id="city"
                    required
                    disabled={!countryCode}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  >
                    <option value="">{countryCode ? "Select city" : "Select country first"}</option>
                    {cityOptions.map((city) => (
                      <option key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-foreground mb-1.5">Country</label>
                  <select
                    id="country"
                    required
                    value={countryCode}
                    onChange={(e) => {
                      const nextCode = e.target.value
                      const selected = countryOptions.find((country) => country.isoCode === nextCode)
                      setCountryCode(nextCode)
                      setFormData((prev) => ({
                        ...prev,
                        country: selected?.name || "",
                        city: "",
                      }))
                    }}
                    className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  >
                    <option value="">Select country</option>
                    {countryOptions.map((country) => (
                      <option key={country.isoCode} value={country.isoCode}>{country.name}</option>
                    ))}
                  </select>
                </div>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="username@gmail.com"
                />
              </div>
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-foreground mb-1.5">Age</label>
                <input
                  id="age"
                  type="number"
                  min="0"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="35"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground mb-1.5">Phone number</label>
              <input
                id="phoneNumber"
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="+213 555-55-55-55"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 pr-12 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Min. 8 characters"
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

            <div className="flex items-start gap-2">
              <input
                id="terms"
                type="checkbox"
                required
                className="w-4 h-4 rounded border-input text-primary focus:ring-ring mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                {"I agree to the "}
                <Link href="#" className="text-accent hover:text-accent/80 font-medium transition-colors">Terms of Service</Link>
                {" and "}
                <Link href="#" className="text-accent hover:text-accent/80 font-medium transition-colors">Privacy Policy</Link>
              </label>
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
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent hover:text-accent/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
