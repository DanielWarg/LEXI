import { MainLayout } from './components/layout/MainLayout';
import { SocketProvider } from './context/SocketContext';
import { ToolConfirmation } from './components/common/ToolConfirmation';
import { SetupWizard } from './components/common/SetupWizard';

function App() {
  return (
    <SocketProvider>
      <MainLayout />
      <ToolConfirmation />
      <SetupWizard />
    </SocketProvider>
  );
}

export default App;
