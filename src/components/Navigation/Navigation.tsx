import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '對比' },
  { to: '/algorithm', label: '演示' },
  { to: '/explanation', label: '說明' },
  { to: '/playground', label: '實驗' },
];

export function Navigation() {
  return (
    <nav className="bg-[#111313] border-b border-[#303636]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center gap-2">
            <img src="/logo.ico" alt="vanish logo" className="h-8 w-8 object-contain" />
          </NavLink>

          <div className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-[#8a8aaa] hover:text-[#cdcfc9] hover:bg-[#303636]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}