import { useAppStore } from '../store'

export function ProfileComponent() {
  // Select only the specific fields needed to prevent unnecessary re-renders
  const user = useAppStore((state) => state.user)
  const setUser = useAppStore((state) => state.setUser)

  return (
    <div>
      <p>Welcome, {user?.name ?? 'Guest'}</p>
      <button onClick={() => setUser({ name: 'Alex', email: 'alex@example.com' })}>
        Log In
      </button>
    </div>
  )
}
