import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSyncStore } from './utils/storage';

async function bootstrap() {
  await Promise.race([
    initSyncStore(),
    new Promise<void>((resolve) => setTimeout(resolve, 1500)),
  ]);
  createRoot(document.getElementById('root')!).render(<App />);
}

void bootstrap();
