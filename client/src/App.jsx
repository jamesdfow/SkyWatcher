//Root application component
//QueryClientProvider enables React Query throughout the app

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GlobeComponent from './components/Globe'

//create a single QueryClient instance for the app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <div className="w-screen h-screen overflow-hidden bg-black">
      <GlobeComponent />
    </div>
    </QueryClientProvider>
  )
}

export default App