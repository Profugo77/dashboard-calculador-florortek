import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Layers,
  Grid3x3,
  Footprints,
  Fence,
  PanelsTopLeft,
  Building2,
  Paintbrush,
  RectangleHorizontal,
  PanelTop,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface Cotizador {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  active: boolean;
}

const cotizadores: Cotizador[] = [
  {
    id: "decks",
    title: "Decks",
    description: "Materiales para decks de exterior e interior",
    icon: Layers,
    route: "/decks",
    active: true,
  },
  {
    id: "pedraflex",
    title: "Pedraflex",
    description: "Placas, adhesivos y esquemas de colocación",
    icon: Grid3x3,
    route: "/pedraflex",
    active: true,
  },
  {
    id: "escaleras",
    title: "Escaleras",
    description: "Pulido, laqueado y colocación vinílico",
    icon: Footprints,
    route: "/escaleras",
    active: true,
  },
  {
    id: "revestimientos",
    title: "Revestimientos Interior",
    description: "Paneles de revestimiento interior",
    icon: PanelsTopLeft,
    route: "/revestimientos",
    active: true,
  },
  {
    id: "revestimientos-exterior",
    title: "Revestimientos Exterior",
    description: "Paneles exterior + perfil omega",
    icon: Building2,
    route: "/revestimientos-exterior",
    active: true,
  },
  {
    id: "laca",
    title: "Laca Pallmann",
    description: "Litros y bidones de laca y sellador",
    icon: Paintbrush,
    route: "/laca",
    active: true,
  },
  {
    id: "pisos-vinilicos",
    title: "Pisos Vinílicos y Zócalos",
    description: "M² de pisos SPC y zócalos",
    icon: RectangleHorizontal,
    route: "/pisos-vinilicos",
    active: true,
  },
  {
    id: "decopanel",
    title: "Decopanel",
    description: "Diseño de paredes con paneles lisos y varillados",
    icon: PanelTop,
    route: "/decopanel",
    active: true,
  },
  {
    id: "pergolas",
    title: "Pérgolas",
    description: "Estructuras de pérgolas y parasoles",
    icon: Fence,
    route: "/pergolas",
    active: true,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const active = cotizadores.filter((c) => c.active);
  const inactive = cotizadores.filter((c) => !c.active);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            FLOORTEK
          </h1>
          <p className="text-sm sm:text-base text-primary-foreground/60 mt-1.5 tracking-wide">
            Sistema de Cotización Técnica
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8">
        <p className="text-sm text-muted-foreground mb-4 sm:mb-5">
          Seleccioná un cotizador
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                onClick={() => navigate(item.route)}
                className="cursor-pointer group transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground leading-tight">
                        {item.title}
                      </h3>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Inactive */}
        {inactive.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">
              Próximamente
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inactive.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.id} className="opacity-45 cursor-default">
                    <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground leading-tight">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-5 text-xs text-muted-foreground">
        Floortek — tiendapisos.com
      </footer>
    </div>
  );
};

export default Index;
