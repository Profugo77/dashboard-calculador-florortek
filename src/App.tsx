import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DeckCalculator from "./pages/DeckCalculator";
import PedraflexCalculator from "./pages/PedraflexCalculator";
import ParasolCalculator from "./pages/ParasolCalculator";
import RevestimientosCalculator from "./pages/RevestimientosCalculator";
import RevestimientosExteriorCalculator from "./pages/RevestimientosExteriorCalculator";
import LacaCalculator from "./pages/LacaCalculator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/decks" element={<DeckCalculator />} />
          <Route path="/pedraflex" element={<PedraflexCalculator />} />
          <Route path="/parasoles" element={<ParasolCalculator />} />
          <Route path="/revestimientos" element={<RevestimientosCalculator />} />
          <Route path="/revestimientos-exterior" element={<RevestimientosExteriorCalculator />} />
          <Route path="/laca" element={<LacaCalculator />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
