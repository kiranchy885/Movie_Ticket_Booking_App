import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import {AppProvider} from "./context/AppContext.jsx"

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <AppProvider>      
      <App />       
      </AppProvider>
    </AuthProvider>
  </BrowserRouter>
)