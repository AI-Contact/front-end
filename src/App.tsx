import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import NavBar from './NavBar'
import Home from './pages/Home'
import Report from './pages/Report'
import Settings from './pages/Settings'
import Game from './pages/Game'
import { useState } from 'react'
import { FaBars } from 'react-icons/fa6'

function App() {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <div className='app'>

        // 상단 네비게이션 토클 버튼, 메인 로고/타이틀
        <header className='header'>
          <button
            className='nav-toggle'
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}>
            <FaBars />
          </button>
          <h1 className='app-title'>AIFitYou</h1>
        </header>

        // 네비게이션 바 | 메인 내용
        <div className={`navbar ${isNavCollapsed ? 'collapsed' : ''}`}>
          <NavBar collapsed={isNavCollapsed} />
        </div>
        <main className='main-content'>
          <Routes>
            <Route path="/" element={<Home />}></Route>
            <Route path="/report" element={<Report />}></Route>
            <Route path="/game" element={<Game />}></Route>
            <Route path="/settings" element={<Settings />}></Route>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
