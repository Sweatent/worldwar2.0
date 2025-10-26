import { useMemo } from 'react'

function App() {
  const message = useMemo(() => 'World War 2.0 Frontend Scaffold Ready', [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black text-center">
      <h1 className="text-4xl font-bold text-slate-100">{message}</h1>
      <p className="mt-4 max-w-3xl text-lg text-slate-400">
        Explore the codebase in <code className="font-mono text-emerald-400">packages/frontend/src</code>{' '}
        to start building out the player experience.
      </p>
    </div>
  )
}

export default App
