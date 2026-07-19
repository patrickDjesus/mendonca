import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/home/HomePage'
import VisaoGeral from './pages/home/VisaoGeral'
import Documentos from './pages/home/Documentos'
import Videos from './pages/home/Videos'
import Desafios from './pages/home/Desafios'
import Perfil from './pages/home/Perfil'

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/home" element={<HomePage />}>
        <Route index element={<VisaoGeral />} />
        <Route path="documentos" element={<Documentos />} />
        <Route path="videos" element={<Videos />} />
        <Route path="desafios" element={<Desafios />} />
        <Route path="perfil" element={<Perfil />} />
      </Route>
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  )
}

export default App
