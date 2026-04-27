import Image from 'next/image'
import Link from 'next/link'

export function NavbarLogo() {
  return (
    <Link
      href="/dashboard"
      className="flex-shrink-0 flex items-center gap-3 group transition-all duration-300 relative"
    >
      <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative w-9 h-9 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
        <Image
          src="/logo.png"
          alt="Logo"
          width={36}
          height={36}
          className="object-contain drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
        />
      </div>
      <div className="flex flex-col leading-none relative">
        <span className="text-lg font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors drop-shadow-md">
          MEDIA<span className="text-indigo-500">HUB</span>
        </span>
      </div>
    </Link>
  )
}
