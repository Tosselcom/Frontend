import Link from "next/link"

export default function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[41.666667vw] flex-col justify-between bg-secondary p-12 pr-14 relative overflow-hidden border-r border-secondary-foreground/10">
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" className="text-primary" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-secondary-foreground/20" aria-hidden="true" />

      <div className="relative z-10 ">
        <Link href="/" aria-label="Go to home page" className="inline-block">
          <img src="/logo dark.svg" alt="FI TRi9i" className="w-80 mb-4" />
        </Link>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center space-y-6 -mt-6">
        <h1 className="text-4xl xl:text-5xl font-bold text-secondary-foreground leading-tight text-balance">
          Connect the right load <br /> to the right truck.
        </h1>
        <p className="text-lg text-secondary-foreground/70 max-w-md leading-relaxed">
          Whether you ship goods or drive trucks, our platform matches you with the right opportunities to grow your business.
        </p>
      </div>

      <div className="relative z-10">
        <p className="text-xs text-secondary-foreground/40">Copyright 2026 &copy; FI TRi9i All Right Reserved.</p>
      </div>
    </div>
  )
}
