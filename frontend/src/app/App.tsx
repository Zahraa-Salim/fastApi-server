/**
 * Root React application component.
 * Renders route configuration and global toast notifications.
 */
import { Toaster } from "react-hot-toast";
import { AppRoutes } from "./routes";

function App() {
  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#0f172a",
          },
        }}
      />
    </>
  );
}

export default App;
