import { Link, useLocation } from 'react-router-dom'

export default function BottomNavigation() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'ホーム', icon: '🏠' },
    { path: '/wines', label: 'ワイン', icon: '🍷' },
    { path: '/records', label: '記録', icon: '📝' },
    { path: '/stats', label: '統計', icon: '📊' },
    { path: '/quiz', label: 'クイズ', icon: '🧠' }
  ]

  return (
    <nav className="bottom-navigation" role="navigation" aria-label="メインナビゲーション">
      {navItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          aria-current={location.pathname === item.path ? 'page' : undefined}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}