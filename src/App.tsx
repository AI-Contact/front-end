import './App.css'

import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import NavBar from './NavBar'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Game from './pages/Game'
import Workout from './pages/Workout'
import Login from './pages/Login'
import Register from './pages/Register'
import AnalysisDemo from './pages/AnalysisDemo'

import { useState } from 'react'
import { FaBars } from 'react-icons/fa6'
import { IoMdNotifications } from 'react-icons/io'
import { getAccessToken } from './auth/token'


const ProtectedRoute = ({ element: Element, ...rest }: { element: React.ElementType }) => {
  const isAuthenticated = getAccessToken();
  return isAuthenticated ? (
    // If authenticated, render the requested component
    <Element {...rest} />
  ) : (
    // If NOT authenticated, redirect to the login page
    <Navigate to="/login" replace />
  );
};


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
                <p className='header-subtitle'>Fitness with AIccuracy</p>
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

          {/* Unprotected Routes (Login and Register) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Default Redirect: Send root path to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* **PROTECTED ROUTES** */}
          {/* Use ProtectedRoute to guard the Home page */}
          <Route path="/home" element={<ProtectedRoute element={Home} />} />

          {/* Use ProtectedRoute to guard other pages */}
          <Route path="/workout" element={<ProtectedRoute element={Workout} />} />
          <Route path="/analysis-demo" element={<AnalysisDemo />}></Route>
          <Route path="/game" element={<ProtectedRoute element={Game} />} />
          <Route path="/settings" element={<ProtectedRoute element={Settings} />} />


          <Route path="*" element={<div>404 Not Found</div>} />

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
