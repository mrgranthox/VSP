import { BrowserRouter } from "react-router-dom";

import { AppProviders } from "@/app/providers";
import { AppRoutes } from "@/app/routes";
import { AppErrorBoundary } from "@/components/system/app-error-boundary";

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <AppErrorBoundary>
        <AppRoutes />
      </AppErrorBoundary>
    </BrowserRouter>
  </AppProviders>
);

export default App;
