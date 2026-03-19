import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

// Prevent requests from hanging forever and leaving UI in loading state.
axios.defaults.timeout = 45000;

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
