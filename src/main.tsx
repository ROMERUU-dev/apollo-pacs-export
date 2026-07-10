import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DesktopPlatformProvider } from './platform/desktop';
import './app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopPlatformProvider><BrowserRouter><App /></BrowserRouter></DesktopPlatformProvider>
  </StrictMode>,
);
