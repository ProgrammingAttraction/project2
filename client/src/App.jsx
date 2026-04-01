import React from 'react'
import { BrowserRouter,Routes,Route } from 'react-router-dom'
import Home from './pages/home/Home'
import Login from './components/auth/login/Login'
import Register from './components/auth/register/Register'
import DepositResult from './pages/callback/DepositResult'
import TransactionHistory from './pages/history/TransactionHistory'
import Withdraw from './pages/withdraw/Withdraw'
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={<Home/>}/>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/deposit/result" element={<DepositResult />} />
        <Route path="/withdraw" element={<Withdraw />} />
        <Route path="/transactions" element={<TransactionHistory />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
