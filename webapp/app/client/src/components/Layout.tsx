import { Outlet, Link, useLocation } from 'react-router-dom'
import { FaHome, FaRobot, FaBook, FaGithub } from 'react-icons/fa'

export function Layout() {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  const navItems = [
    { path: '/', label: 'Home', icon: FaHome },
    { path: '/bot', label: 'Bot Trading', icon: FaRobot },
  ]

  const externalLinks = [
    { href: '/swagger', label: 'API Docs', icon: FaBook },
    { href: 'https://github.com/MarcosBrendonDePaula/FluxStack', label: 'GitHub', icon: FaGithub },
  ]

  // Se estiver na home page, não mostrar navegação
  if (location.pathname === '/') {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation Header */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl">
              <span className="text-2xl">🔥</span>
              FluxStack
            </Link>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center gap-6">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    isActive(path)
                      ? 'bg-purple-600/50 text-white border border-purple-500/50'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="text-sm" />
                  {label}
                </Link>
              ))}
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

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button className="text-white p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation (hidden by default) */}
          <div className="md:hidden border-t border-white/10 py-4">
            <div className="flex flex-col gap-2">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    isActive(path)
                      ? 'bg-purple-600/50 text-white border border-purple-500/50'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="text-sm" />
                  {label}
                </Link>
              ))}
              <div className="flex gap-2 mt-2">
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