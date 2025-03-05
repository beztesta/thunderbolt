import { Route, Router } from '@solidjs/router'
import { lazy } from 'solid-js'
import { render } from 'solid-js/web'

const App = lazy(() => import('./App'))
const Settings = lazy(() => import('./Settings'))
const NotFound = lazy(() => import('./NotFound'))

render(
  () => (
    <Router>
      <Route path="/" component={App} />
      <Route path="/settings" component={Settings} />
      <Route path="*404" component={NotFound} />
    </Router>
  ),
  document.getElementById('root') as HTMLElement
)
