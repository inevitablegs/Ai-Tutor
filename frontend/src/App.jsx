import React from 'react'
import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import AuthForm from './pages/AuthForm';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import Quiz from './pages/Quiz';


function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard/*" element={<Dashboard/>} />
        <Route path="/quiz" element={<Quiz />} />

        <Route path="/auth" element={<AuthForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App