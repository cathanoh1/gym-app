import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import './index.css'
import { Food } from './pages/Food'
import { Habits } from './pages/Habits'
import { Today } from './pages/Today'
import { Workouts } from './pages/Workouts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Today />} />
          <Route path="lift" element={<Workouts />} />
          <Route path="food" element={<Food />} />
          <Route path="habits" element={<Habits />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)
