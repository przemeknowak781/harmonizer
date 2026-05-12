import { MainLayout } from "./components/layout/MainLayout";
import { MobileLayout } from "./components/layout/MobileLayout";
import { useIsMobile } from "./hooks/use-is-mobile";

function App() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileLayout /> : <MainLayout />;
}

export default App;
