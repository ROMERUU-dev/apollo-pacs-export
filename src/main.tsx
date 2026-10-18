import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CLINIC } from './brand';
import { demoEnabled, installDemoServer } from './demo/mockServer';
import './app.css';

if (demoEnabled()) installDemoServer();
document.title = `${CLINIC.name} ${CLINIC.location}`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </StrictMode>,
);
