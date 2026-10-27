import Image from 'next/image'
import Link from 'next/link'

export function NavbarLogo() {
  return (
    <Link
      href="/dashboard"
      className="flex-shrink-0 flex items-center gap-3 group relative"
    >
      <div className="relative w-9 h-9 transition-[scale] duration-300 ease-onyx group-hover:scale-110">
        {/* Monochrome comme l'app : le logo ne prend sa couleur qu'au survol */}
        <Image
          src="/logo.png"
          alt="Logo"
          width={36}
          height={36}
          className="object-contain grayscale brightness-200 contrast-125 transition-[filter] duration-500 ease-onyx group-hover:grayscale-0 group-hover:brightness-100"
        />
      </div>
      <span className="relative text-[15px] font-bold uppercase tracking-[0.22em] text-white">
        Media<span className="text-gray-500 transition-colors duration-300 group-hover:text-gray-300">hub</span>
      </span>
    </Link>
  )
}
