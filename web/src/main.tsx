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
import '@fontsource/roboto-condensed/400.css';
import '@fontsource/roboto-condensed/500.css';
import '@fontsource/roboto-condensed/700.css';
import './index.scss';
import './styles/glass.scss';
import './styles/minimal.scss';
import './styles/midnight.scss';
import './styles/outline.scss';
import './styles/delperro.scss';
import './styles/motion.scss';
import { ItemNotificationsProvider } from './components/utils/ItemNotifications';
import { isEnvBrowser } from './utils/misc';
import { applyUiStyle, isUiStyle, previewUiStyle } from './utils/uistyle';

const root = document.getElementById('root');

// guide tiles by default until the client sends inventory:uistyle
document.documentElement.dataset.uistyle = 'tactical';

// #backdrop=<theme>: the page as a DUI behind the inspected weapon (modules/weapon/inspect.lua),
// showing only the inventory backdrop as it looks while inspecting, so the inspect window matches it
const backdropTheme = new URLSearchParams(window.location.hash.slice(1)).get('backdrop');

if (backdropTheme !== null) {
  if (isUiStyle(backdropTheme)) applyUiStyle(backdropTheme);

  // the client sends { uistyle } when the player switches theme
  window.addEventListener('message', (event) => {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (isUiStyle(data?.uistyle)) applyUiStyle(data.uistyle);
  });
} else if (isEnvBrowser()) {
  // the preview opens on its last picked theme (glass at first); ?uistyle= overrides it
  applyUiStyle(previewUiStyle());

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
  backdropTheme !== null ? (
    <div className="inventory-wrapper" data-inspecting="true">
      <div className="inventory-backdrop" />
    </div>
  ) : (
    <React.StrictMode>
      <Provider store={store}>
        <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
          <ItemNotificationsProvider>
            <App />
          </ItemNotificationsProvider>
        </DndProvider>
      </Provider>
    </React.StrictMode>
  )
);
