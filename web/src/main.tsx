import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { store } from './store';
import App from './App';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/chakra-petch/700-italic.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './index.scss';
import './styles/glass.scss';
import './styles/minimal.scss';
import './styles/motion.scss';
import { ItemNotificationsProvider } from './components/utils/ItemNotifications';
import { isEnvBrowser } from './utils/misc';

const root = document.getElementById('root');

// guide tiles by default until the client sends inventory:uistyle
document.documentElement.dataset.uistyle = 'tactical';

if (isEnvBrowser()) {
  // ?uistyle=glass or ?uistyle=minimal previews the other themes outside the game
  const uistyle = new URLSearchParams(window.location.search).get('uistyle');
  if (uistyle) document.documentElement.dataset.uistyle = uistyle;

  // Mock game frame on its own layer, blurred like the in-game screenblur so the UI reads
  // as it will in FiveM. ?blur=0 shows it sharp. Night time img: https://i.imgur.com/iPTAdYV.png
  const blur = new URLSearchParams(window.location.search).get('blur') ?? '10';
  const backdrop = document.createElement('div');
  Object.assign(backdrop.style, {
    position: 'fixed',
    inset: '-40px', // overscan so the blur doesn't fade at the screen edges
    zIndex: '-1',
    backgroundImage: 'url("https://i.imgur.com/3pzRj9n.png")',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    filter: `blur(${Number(blur) || 0}px)`,
    pointerEvents: 'none',
  });
  document.body.prepend(backdrop);
}

createRoot(root!).render(
  <React.StrictMode>
    <Provider store={store}>
      <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
        <ItemNotificationsProvider>
          <App />
        </ItemNotificationsProvider>
      </DndProvider>
    </Provider>
  </React.StrictMode>
);
