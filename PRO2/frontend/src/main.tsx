import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Bypass ngrok warning for all fetch requests
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  init = init || {};
  init.headers = {
    ...init.headers,
    'ngrok-skip-browser-warning': 'true'
  };
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
