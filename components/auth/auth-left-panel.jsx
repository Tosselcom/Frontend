import Link from "next/link"

export default function AuthLeftPanel() {
  return (
    <div className="hidden xl:flex xl:fixed xl:inset-y-0 xl:left-0 xl:w-1/2 flex-col justify-between bg-[#f0f2f5] p-8 2xl:p-12 2xl:pr-14 relative overflow-hidden border-r border-black/5">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-black/10" aria-hidden="true" />

      <div className="relative z-10">
        <Link href="/" aria-label="Go to home page" className="inline-block">
          <img src="/logo white.svg" alt="FI TRi9i" className="w-56 2xl:w-80 mb-4" />
        </Link>
      </div>

      <div className="relative z-10 flex-1 grid grid-cols-1 2xl:grid-cols-[0.95fr_1.05fr] items-center gap-8 -mt-2 2xl:-mt-4">
        <h1 className="text-4xl 2xl:text-6xl font-bold leading-[0.98] tracking-tight text-[#05070d]">
          Connect the
          <br />
          right load
          <br />
          <span className="text-primary">to the right truck.</span>
        </h1>

        <div className="relative h-[420px] 2xl:h-[520px] w-full max-w-[380px] 2xl:max-w-none">
          <div className="absolute right-2 2xl:right-4 top-2 w-[260px] 2xl:w-[318px] rounded-[26px] overflow-hidden border-4 border-white bg-white shadow-[0_22px_40px_rgba(10,25,55,0.22)]">
            <img
              src="/p1-login.jpg"
              alt="People sharing a moment"
              className="h-[340px] 2xl:h-[420px] w-full object-cover"
            />
          </div>

          <div className="absolute right-[-24px] 2xl:right-[-50px] top-[-18px] 2xl:top-[-50px] w-[200px] 2xl:w-[238px] rounded-[22px] overflow-hidden border-4 border-white bg-white shadow-[0_16px_28px_rgba(10,25,55,0.18)]">
            <img
              src="/p2-login.jpg"
              alt="Transport and logistics activity"
              className="h-[220px] 2xl:h-[280px] w-full object-cover"
            />
          </div>

          <div className="absolute left-[-16px] 2xl:left-[-30px] bottom-1 w-[136px] 2xl:w-[172px] rounded-full overflow-hidden border-[6px] border-primary bg-white shadow-[0_12px_24px_rgba(10,25,55,0.2)]">
            <img
              src="/p3-login.jpg"
              alt="Profile style image"
              className="h-[136px] 2xl:h-[170px] w-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-xs text-black/40">Copyright 2026 &copy; FI TRi9i All Right Reserved.</p>
      </div>
    </div>
  )
}
