/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useAppContext } from './context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Dashboard from './Dashboard';
import Leads from './Leads';
import Clients from './Clients';
import Payments from './Payments';
import PrivateSessions from './PrivateSessions';
import AuditLogs from './AuditLogs';
import Tasks from './Tasks';
import Settings from './Settings';
import Login from './Login';
import { Activity, Users, UserPlus, CreditCard, LogOut, Calendar as CalendarIcon, ShieldAlert, Settings as SettingsIcon, Eye, EyeOff, CheckSquare, Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

function AppContent() {
  const { currentUser, logout, isAuthReady, previewRole, setPreviewRole, searchQuery, setSearchQuery, branding } = useAppContext();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  const isPreviewing = previewRole === 'rep';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b bg-card shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-2">
              {branding.logoUrl ? (
                <img 
                  src={branding.logoUrl} 
                  alt={branding.companyName} 
                  className="h-8 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <h1 className="text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-primary font-logo">
                  {branding.companyName}
                </h1>
              )}
            </div>
            <div className="hidden md:flex relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, phone, or ID..."
                className="w-full pl-9 bg-muted/50 border-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {currentUser.email === "michaelmitry13@gmail.com" && (
              <Button 
                variant={isPreviewing ? "default" : "outline"} 
                size="sm" 
                onClick={() => setPreviewRole(isPreviewing ? null : 'rep')}
                className="hidden sm:flex items-center space-x-2 h-8"
              >
                {isPreviewing ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{isPreviewing ? "Exit Preview" : "Preview Rep View"}</span>
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 ml-auto">
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => {
                const searchBar = document.getElementById('mobile-search');
                if (searchBar) searchBar.classList.toggle('hidden');
              }}>
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground flex flex-col items-end">
              <span className="font-bold text-foreground truncate max-w-[120px] sm:max-w-none">{currentUser.name}</span>
              <span className={`text-[10px] sm:text-xs uppercase tracking-wider ${isPreviewing ? 'text-amber-500 font-bold' : ''}`}>
                {isPreviewing ? 'Preview: Sales Rep' : currentUser.role}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="h-8 w-8 sm:h-10 sm:w-10">
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div id="mobile-search" className="hidden md:hidden bg-card border-b p-2">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, phone, or ID..."
            className="w-full pl-9 bg-muted/50 border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
            <TabsList className="flex w-max sm:w-full bg-muted/50 rounded-lg p-1 justify-start sm:justify-center">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm">Dashboard</TabsTrigger>
              
              {(currentUser.role === 'manager' || currentUser.role === 'rep' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') && (
                <TabsTrigger value="leads" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm">
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Leads
                </TabsTrigger>
              )}
              
              <TabsTrigger value="clients" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Members
              </TabsTrigger>

              <TabsTrigger value="tasks" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm">
                <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Tasks
              </TabsTrigger>
              
              {(currentUser.role === 'manager' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') && (
                <>
                  <TabsTrigger value="payments" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm">
                    <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value="sessions" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm">
                    <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Sessions
                  </TabsTrigger>
                </>
              )}
              
              {(currentUser.role === 'manager' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') && (
                <>
                  <TabsTrigger value="audit" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm">
                    <ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Audit
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm">
                    <SettingsIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Settings
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="m-0 animate-in fade-in-50 duration-500">
            <Dashboard />
          </TabsContent>

          {(currentUser.role === 'manager' || currentUser.role === 'rep' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') && (
            <TabsContent value="leads" className="m-0 animate-in fade-in-50 duration-500">
              <Leads />
            </TabsContent>
          )}

          <TabsContent value="clients" className="m-0 animate-in fade-in-50 duration-500">
            <Clients />
          </TabsContent>

          <TabsContent value="tasks" className="m-0 animate-in fade-in-50 duration-500">
            <Tasks />
          </TabsContent>

          {(currentUser.role === 'manager' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') && (
            <>
              <TabsContent value="payments" className="m-0 animate-in fade-in-50 duration-500">
                <Payments />
              </TabsContent>

              <TabsContent value="sessions" className="m-0 animate-in fade-in-50 duration-500">
                <PrivateSessions />
              </TabsContent>
            </>
          )}

          {(currentUser.role === 'manager' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') && (
            <>
              <TabsContent value="audit" className="m-0 animate-in fade-in-50 duration-500">
                <AuditLogs />
              </TabsContent>
              <TabsContent value="settings" className="m-0 animate-in fade-in-50 duration-500">
                <Settings />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
