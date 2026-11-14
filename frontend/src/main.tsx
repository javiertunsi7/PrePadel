import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { api } from './lib/api';
import { captureClubLink } from './lib/club';
import { AppStore, StoreProvider } from './lib/store';
import './styles.css';

const store = new AppStore(api);
// Antes que el router: si se abrió con el enlace de un club, se guarda y se limpia la dirección.
captureClubLink(store.getState().token !== null);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
);
