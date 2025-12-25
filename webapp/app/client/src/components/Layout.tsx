import { Outlet } from 'react-router-dom'
import { FaBook, FaGithub, FaRobot } from 'react-icons/fa'

export function Layout() {
  const externalLinks = [
    { href: '/swagger', label: 'API Docs', icon: FaBook },
    { href: 'https://github.com/MarcosBrendonDePaula/FluxStack', label: 'GitHub', icon: FaGithub },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation Header */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2 text-white font-bold text-xl">
              <FaRobot className="text-2xl text-orange-500" />
              <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Bot Trading Solana
              </span>
            </div>

            {/* External Links */}
            <div className="hidden md:flex items-center gap-4">
              {externalLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-all"
                >
                  <Icon className="text-sm" />
                  {label}
                </a>
              ))}
            </div>

            {/* Mobile External Links */}
            <div className="md:hidden flex items-center gap-2">
              {externalLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded text-sm font-medium hover:bg-white/20 transition-all"
                >
                  <Icon className="text-xs" />
                  <span className="hidden sm:inline">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}