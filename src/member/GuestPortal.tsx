import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context';
import { useCart } from './CartContext';
import CartDrawer from './CartDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Bell, ChevronRight, LogIn } from 'lucide-react';

interface GuestPortalProps {
  onSwitchToCRM: () => void;
}

export default function GuestPortal({ onSwitchToCRM }: GuestPortalProps) {
  const { packages, branding } = useAppContext();
  const { addToCart } = useCart();
  const [showPreloader, setShowPreloader] = useState(true);
  const [activeTab, setActiveTab] = useState<'book' | 'locations' | 'schedule' | 'announcements'>('book');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Filter packages based on the user's requirements
  const kidsPackages = packages.filter(p => p.name.toLowerCase().includes('kid') || p.name.toLowerCase().includes('junior'));
  
  // Example for adult packages 10, 20, 30
  const adultPackages = packages.filter(p => 
    !p.name.toLowerCase().includes('kid') && 
    !p.name.toLowerCase().includes('junior') &&
    (p.sessions === 10 || p.sessions === 20 || p.sessions === 30)
  ).sort((a, b) => a.sessions - b.sessions);

  if (showPreloader) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center transition-opacity duration-500">
        <div className="relative animate-pulse flex flex-col items-center">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="STRIKE" className="h-24 w-auto object-contain brightness-0 invert" />
          ) : (
            <h1 className="text-5xl font-logo tracking-[0.3em] text-white font-bold">STRIKE</h1>
          )}
          <div className="h-1 w-24 bg-white/20 mt-8 rounded-full overflow-hidden">
            <div className="h-full bg-white animate-[slide_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="STRIKE" className="h-8 w-auto object-contain" />
          ) : (
            <h1 className="text-xl font-logo tracking-[0.2em] font-bold">STRIKE</h1>
          )}
        </div>
        <div className="flex items-center gap-3">
          <CartDrawer />
        </div>
      </header>

      {/* TABS */}
      <div className="bg-card border-b px-2 flex overflow-x-auto no-scrollbar py-2 gap-2 sticky top-16 z-30">
        {[
          { id: 'book', label: 'Book', icon: <Calendar className="h-4 w-4" /> },
          { id: 'locations', label: 'Locations', icon: <MapPin className="h-4 w-4" /> },
          { id: 'schedule', label: 'Schedule', icon: <Clock className="h-4 w-4" /> },
          { id: 'announcements', label: 'News', icon: <Bell className="h-4 w-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'book' && (
          <div className="space-y-8 py-6">
            
            {/* SLIDESHOW (Featured) */}
            <div className="px-4">
              <h2 className="text-xl font-bold tracking-tight mb-4">Featured Sessions</h2>
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar">
                {[1, 2, 3].map(i => (
                  <div key={i} className="snap-center shrink-0 w-[85vw] max-w-[300px] h-48 rounded-2xl relative overflow-hidden group shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/80 to-transparent z-10" />
                    <img 
                      src={`https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=600&auto=format&fit=crop`} 
                      alt="Boxing" 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute bottom-4 left-4 right-4 z-20">
                      <Badge className="mb-2 bg-white text-black hover:bg-white">Special</Badge>
                      <h3 className="text-white font-bold text-lg leading-tight">Advanced Strike Class</h3>
                      <p className="text-white/70 text-xs mt-1 mb-3">Maxim Compound • 7:00 PM</p>
                      <Button size="sm" className="w-full font-bold">Book Now</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KIDS PACKAGES */}
            <div className="px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-tight">Kids Sessions</h2>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maxim Branch</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {kidsPackages.length > 0 ? (
                  kidsPackages.map(pkg => (
                    <div key={pkg.id} className="bg-card border rounded-2xl p-4 flex gap-4 shadow-sm">
                      <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden shrink-0">
                        <img 
                          src="https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=200&auto=format&fit=crop" 
                          alt="Kids Boxing" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <h3 className="font-bold text-sm">{pkg.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{pkg.sessions} Sessions • {pkg.expiryDays} Days</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-bold text-primary">{pkg.price.toLocaleString()} EGP</span>
                          <Button size="sm" onClick={() => addToCart(pkg)} className="h-7 px-3 text-xs font-bold rounded-full">Add</Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-dashed rounded-2xl text-muted-foreground">
                    No kids packages currently available.
                  </div>
                )}
              </div>
            </div>

            {/* IMPACT SISTER COMPANY */}
            <div className="px-4 my-8">
              <div className="rounded-2xl overflow-hidden relative shadow-xl">
                <div className="absolute inset-0 bg-black/60 z-10" />
                <img 
                  src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop" 
                  alt="IMPACT" 
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
                  <h2 className="text-4xl font-bold tracking-tighter text-white mb-2">IMPACT</h2>
                  <p className="text-white/80 text-sm mb-6 max-w-[250px]">Our sister company focusing on functional training and conditioning.</p>
                  <Button variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-md hover:bg-white hover:text-black transition-colors rounded-full font-bold px-8">
                    Discover More
                  </Button>
                </div>
              </div>
            </div>

            {/* ADULT PACKAGES */}
            <div className="px-4">
              <h2 className="text-xl font-bold tracking-tight mb-4">Adult Packages</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {adultPackages.length > 0 ? (
                  adultPackages.map(pkg => (
                    <div key={pkg.id} className="group relative bg-card border rounded-2xl p-5 shadow-sm overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <h1 className="text-8xl font-black italic">{pkg.sessions}</h1>
                      </div>
                      <div className="relative z-10">
                        <Badge variant="secondary" className="mb-3">{pkg.type}</Badge>
                        <h3 className="font-bold text-lg">{pkg.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">{pkg.expiryDays} Days Validity</p>
                        <div className="flex items-center justify-between">
                          <span className="font-black text-2xl tracking-tight">{pkg.price.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">EGP</span></span>
                          <Button onClick={() => addToCart(pkg)} className="font-bold rounded-full h-10 w-10 p-0 shadow-lg">
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-dashed rounded-2xl text-muted-foreground col-span-full">
                    No 10, 20, or 30 session adult packages currently available.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* OTHER TABS PLACEHOLDERS */}
        {activeTab !== 'book' && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <h2 className="text-xl font-bold text-foreground mb-2 capitalize">{activeTab}</h2>
            <p className="text-sm">This section is currently under construction.</p>
          </div>
        )}
      </main>

      {/* BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-40 flex justify-center">
        <Button 
          variant="outline" 
          className="w-[90vw] max-w-sm rounded-full shadow-xl bg-background/90 backdrop-blur-md border-border/50 text-xs font-bold h-12"
          onClick={onSwitchToCRM}
        >
          <LogIn className="h-4 w-4 mr-2" />
          Member / Staff Login
        </Button>
      </div>
      
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
