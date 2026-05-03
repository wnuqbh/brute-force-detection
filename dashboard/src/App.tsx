import { useState } from "react";
import LoginPage from "./pages/LoginPagePremium";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return <DashboardPage />;
}

export default App;