import './App.css'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import NavBar from './NavBar'
import Home from './pages/Home'
import Report from './pages/Report'
import Settings from './pages/Settings'
import Game from './pages/Game'
import Workout from './pages/Workout'
import Login from './pages/Login'
import Register from './pages/Register'
import { useState } from 'react'
import { FaBars } from 'react-icons/fa6'
import { IoMdNotifications } from 'react-icons/io'

function AppContent() {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className='app'>
      {!isAuthPage && (
        <>
          {/* 상단 헤더 */}
          <header className='header'>
            <button
              className='nav-toggle'
              onClick={() => setIsNavCollapsed(!isNavCollapsed)}>
              <FaBars />
            </button>
            <div className='header-content'>
              <div className='header-text'>
                <p className='header-subtitle'>Fitness with Accuracy</p>
                <h1 className='header-title'>정확하고 꾸준하게 운동할 수 있게, AI와 함께!</h1>
              </div>
              <div className='header-actions'>
                <button className='notification-btn'>
                  <IoMdNotifications />
                </button>
                <div className='user-profile'>
                  <img src="https://ui-avatars.com/api/?name=User&background=4F46E5&color=fff&size=40" alt="User" />
                </div>
              </div>
            </div>
          </header>

          {/* 네비게이션 바 */}
          <NavBar collapsed={isNavCollapsed} />
        </>
      )}

      {/* 메인 콘텐츠 */}
      <main className={isAuthPage ? 'login-main' : `main-content ${isNavCollapsed ? 'expanded' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/register" element={<Register />}></Route>
          <Route path="/" element={<Home />}></Route>
          <Route path="/workout" element={<Workout />}></Route>
          <Route path="/report" element={<Report />}></Route>
          <Route path="/game" element={<Game />}></Route>
          <Route path="/settings" element={<Settings />}></Route>
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
