import { MainLayout } from './components/layout/MainLayout';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <SocketProvider>
      <MainLayout />
    </SocketProvider>
  );
}

export default App;
