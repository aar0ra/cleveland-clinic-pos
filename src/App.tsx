import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import POSApp from "@/pages/POSApp";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <POSApp />
    </QueryClientProvider>
  );
}

export default App;
