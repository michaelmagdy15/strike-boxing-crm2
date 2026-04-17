import React from 'react';
import { useAuth, useSettings } from './context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { Shield, Sparkles, Zap } from 'lucide-react';

export default function Login() {
  const { branding } = useSettings();
  const { login, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
            <div className="h-24 w-24 rounded-full border-t-2 border-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary animate-pulse" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-lg z-10"
      >
        <div className="text-center mb-12">
          {branding.logoUrl ? (
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <img 
                    src={branding.logoUrl} 
                    alt={branding.companyName} 
                    className="h-32 w-auto object-contain mx-auto drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] mb-8"
                    referrerPolicy="no-referrer"
                />
            </motion.div>
          ) : (
            <div className="space-y-4">
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-8xl font-black tracking-tighter uppercase text-white font-logo bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40"
              >
                {branding.companyName}
              </motion.h1>
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-4"
              >
                <div className="h-px w-12 bg-white/20" />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.8em]">
                    Advanced CRM Operations
                </p>
                <div className="h-px w-12 bg-white/20" />
              </motion.div>
            </div>
          )}
        </div>

        <Card className="bg-white/5 backdrop-blur-3xl border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[40px] overflow-hidden">
          <CardHeader className="text-center p-12 pb-6">
            <div className="mx-auto bg-primary/10 h-16 w-16 rounded-2xl flex items-center justify-center mb-6 border border-primary/20">
                <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-white mb-2 underline decoration-primary decoration-4 underline-offset-8">Authorized Access Only</CardTitle>
            <CardDescription className="text-zinc-400 font-medium text-lg mt-4">Initialize secure session via authenticated provider.</CardDescription>
          </CardHeader>
          <CardContent className="p-12 pt-6">
            <Button
              variant="outline"
              className="w-full h-20 text-xl justify-center px-10 bg-white hover:bg-zinc-100 text-black border-none rounded-3xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl group"
              onClick={() => login()}
            >
              <div className="flex items-center space-x-4">
                <svg className="h-7 w-7 transition-transform group-hover:rotate-12" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                </svg>
                <span className="font-black italic uppercase tracking-wider">Access with Google</span>
              </div>
            </Button>
            
            <div className="mt-12 flex items-center justify-between opacity-30">
                <div className="h-px flex-1 bg-white/20" />
                <Sparkles className="mx-4 h-4 w-4" />
                <div className="h-px flex-1 bg-white/20" />
            </div>
            
            <p className="text-center text-[10px] font-black text-white/20 uppercase tracking-[4px] mt-8">
                Strike Harder. Dont Limit Your Challenges.
            </p>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-12 left-0 right-0 text-center opacity-20 hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-black tracking-[1em] uppercase">Built for Champions | Powered by Combat Science</p>
      </div>
    </div>
  );
}
