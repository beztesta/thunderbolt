import { Outlet } from 'react-router'
import './index.css'

export default function Layout() {
  return (
    <main className="flex h-screen w-screen">
      <Outlet />
    </main>
  )
}
