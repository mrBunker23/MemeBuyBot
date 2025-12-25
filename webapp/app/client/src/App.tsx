import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LiveComponentsProvider } from '@/core/client'
import { Layout } from './components/Layout'
import { HomePage, BotPage } from './pages'

function App() {
  return (
    <LiveComponentsProvider
      autoConnect={true}
      reconnectInterval={1000}
      maxReconnectAttempts={5}
      heartbeatInterval={30000}
      debug={false}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/bot" element={<BotPage />} />
          </Route>
        </Routes>
      </Router>
    </LiveComponentsProvider>
  )
}

export default App
