import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, ArrowUpRight, Fence, Umbrella, Wallpaper, SquareStack, ArrowRight, Boxes } from "lucide-react";

const cotizadores = [
  {
    id: "decks",
    title: "Decks",
    description: "Calculá materiales para decks de exterior e interior",
    icon: Layers,
    route: "/decks",
    active: true,
  },
  {
    id: "pedraflex",
    title: "Pedraflex",
    description: "Calculá placas, adhesivos y esquemas de colocación",
    icon: Boxes,
    route: "/pedraflex",
    active: true,
  },
  {
    id: "escaleras",
    title: "Escaleras",
    description: "Cotizá escaleras rectas, en L y caracol",
    icon: ArrowUpRight,
    route: "/escaleras",
    active: false,
  },
  {
    id: "pergolas",
    title: "Pérgolas",
    description: "Calculá estructuras de pérgolas y parasoles",
    icon: Fence,
    route: "/pergolas",
    active: false,
  },
  {
    id: "revestimientos",
    title: "Revestimientos Interior",
    description: "Cotizá paneles de revestimiento interior",
    icon: Wallpaper,
    route: "/revestimientos",
    active: true,
  },
  {
    id: "revestimientos-exterior",
    title: "Revestimientos Exterior",
    description: "Paneles exterior + perfil omega",
    icon: Wallpaper,
    route: "/revestimientos-exterior",
    active: true,
  },
  {
    id: "pisos-vinilicos",
    title: "Pisos Vinílicos",
    description: "Calculá pisos vinílicos SPC y accesorios",
    icon: SquareStack,
    route: "/pisos-vinilicos",
    active: false,
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            FLOORTEK
          </h1>
          <p className="text-sm text-primary-foreground/70 mt-1">
            Sistema de Cotización Técnica
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-foreground mb-5">
          Seleccioná un cotizador
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cotizadores.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                className={`transition-all duration-200 ${
                  item.active
                    ? "cursor-pointer hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5"
                    : "opacity-50 cursor-default"
                }`}
                onClick={() => item.active && navigate(item.route)}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                      item.active
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">
                        {item.title}
                      </h3>
                      {item.active ? (
                        <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          Próximamente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        Floortek — tiendapisos.com
      </footer>
    </div>
  );
};

export default Index;
