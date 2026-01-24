import { MainLayout } from './components/layout/MainLayout';
import { SocketProvider } from './context/SocketContext';
import { ToolConfirmation } from './components/common/ToolConfirmation';

function App() {
  return (
    <SocketProvider>
      <MainLayout />
      <ToolConfirmation />
    </SocketProvider>
  );
}

export default App;
