import { A } from '@solidjs/router'

export default function NotFound() {
  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div class="text-center max-w-md">
        <h1 class="text-6xl font-bold text-indigo-600 mb-4">404</h1>
        <h2 class="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
        <p class="text-gray-600 mb-6">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
        <A href="/" class="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors font-medium">
          Return to Home
        </A>
      </div>
    </div>
  )
}
