import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAppContext } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Camera, CheckCircle, User, History, AlertCircle, MapPin, Scan } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Branch } from './types';

export default function Attendance({ isKiosk = false }: { isKiosk?: boolean }) {
  const { clients, recordAttendance, attendances, currentUser, users } = useAppContext();
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch>(() => {
    if (isKiosk) {
      const saved = localStorage.getItem('kioskBranch');
      if (saved) return saved as Branch;
    }
    return 'COMPLEX';
  });
  const [lastScannedMember, setLastScannedMember] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsScanning(true);
    
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      await scanner.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        undefined
      );
    } catch (err) {
      console.error(err);
      setError("Could not access camera. Please ensure you have granted permission.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error(err);
      }
    }
    setIsScanning(false);
  };

  const handleScanSuccess = (decodedId: string) => {
    const member = clients.find(c => c.id === decodedId || c.memberId === decodedId);
    if (member) {
      setLastScannedMember(member);
      setScannedId(member.id);
      stopScanner();
      setError(null);
    } else {
      setError("No member found with that ID or QR Code.");
    }
  };

  const handleRecordAttendance = async () => {
    if (!lastScannedMember || isRecording) return;
    
    setIsRecording(true);
    try {
      await recordAttendance(lastScannedMember.id, selectedBranch);
      setSuccessMessage(`Attendance recorded for ${lastScannedMember.name}!`);
      setTimeout(() => {
        setLastScannedMember(null);
        setScannedId(null);
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError("Failed to record attendance. Please try again.");
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Scanner</h2>
          <p className="text-muted-foreground">Scan member QR codes to record attendance and manage packages.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border">
          <MapPin className="h-4 w-4 text-muted-foreground ml-2" />
          <select 
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer pr-8"
            value={selectedBranch}
            onChange={(e) => {
              const branch = e.target.value as Branch;
              setSelectedBranch(branch);
              if (isKiosk) {
                localStorage.setItem('kioskBranch', branch);
              }
            }}
          >
            <option value="COMPLEX">COMPLEX Branch</option>
            <option value="MIVIDA">MIVIDA Branch</option>
            <option value="Strike IMPACT">Strike IMPACT</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Section */}
        <Card className="lg:col-span-7 overflow-hidden border-2 border-primary/10 shadow-lg">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center text-primary text-lg">
              <Scan className="mr-2 h-5 w-5" />
              Live Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative bg-black aspect-video flex items-center justify-center">
            {isScanning ? (
              <div id="qr-reader" className="w-full h-full"></div>
            ) : (
              <div className="flex flex-col items-center justify-center text-white space-y-4 p-8 text-center">
                <div className="bg-white/10 p-6 rounded-full animate-pulse">
                  <Camera className="h-12 w-12" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Ready to Scan</h3>
                  <p className="text-white/60 text-sm max-w-[250px] mt-1">
                    Point your camera at the member's QR code on their phone or card.
                  </p>
                </div>
                <Button 
                  size="lg" 
                  className="bg-white text-black hover:bg-white/90 font-bold px-8"
                  onClick={startScanner}
                >
                  Start Camera
                </Button>
              </div>
            )}
            
            {isScanning && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="absolute bottom-4 right-4 z-10"
                onClick={stopScanner}
              >
                Cancel
              </Button>
            )}
          </CardContent>
          
          <div className="bg-muted/30 p-6 border-t">
            <div className="flex flex-col space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Manual ID Entry</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter Member ID (e.g. 112)" 
                  className="bg-background h-11"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleScanSuccess(e.currentTarget.value);
                    }
                  }}
                />
                <Button 
                  variant="secondary" 
                  className="h-11 px-6 font-bold"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    handleScanSuccess(input.value);
                  }}
                >
                  Find Member
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic ml-1">
                Enter either the readable Member ID or the system unique identifier.
              </p>
            </div>
          </div>
        </Card>

        {/* Member Info / Result Section */}
        <div className="lg:col-span-5 space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-600 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          )}

          {lastScannedMember ? (
            <Card className="border-2 border-green-500/20 shadow-xl animate-in zoom-in-95 duration-200">
              <CardHeader className="pb-2">
                <Badge className="w-fit mb-2 bg-green-500 hover:bg-green-600">Scan Successful</Badge>
                <CardTitle className="text-2xl">{lastScannedMember.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Member ID</Label>
                    <p className="font-mono text-sm">#{lastScannedMember.memberId || lastScannedMember.id.substring(0, 8)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status</Label>
                    <div>
                      <Badge variant={lastScannedMember.status === 'Active' ? 'secondary' : 'destructive'} className="text-[10px]">
                        {lastScannedMember.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Package</Label>
                    <p className="text-sm font-medium truncate">{lastScannedMember.packageType || 'None'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Packages Left</Label>
                    <p className={`text-lg font-bold ${Number(lastScannedMember.sessionsRemaining) <= 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {lastScannedMember.sessionsRemaining} packages
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button 
                    className="w-full py-6 text-lg font-bold shadow-lg"
                    onClick={handleRecordAttendance}
                    disabled={isRecording}
                  >
                    {isRecording ? "Recording..." : "Confirm Attendance"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-muted-foreground"
                    onClick={() => {
                      setLastScannedMember(null);
                      setScannedId(null);
                      setError(null);
                    }}
                  >
                    Dismiss & Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="h-[300px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <User className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">No Member Selected</p>
                <p className="text-xs mt-1">The member's profile will appear here once their QR code is successfully scanned.</p>
              </CardContent>
            </Card>
          )}

          {/* Recent History Preview */}
          {!isKiosk && (
            <Card>
              <CardHeader className="py-4 border-b">
                <CardTitle className="text-sm font-bold flex items-center">
                  <History className="mr-2 h-4 w-4" />
                  Today's Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[250px] overflow-y-auto">
                  {attendances
                    .filter(a => parseISO(a.date).toDateString() === new Date().toDateString())
                    .map(a => {
                      const client = clients.find(c => c.id === a.clientId);
                      const recorder = users.find(u => u.id === a.recordedBy);
                      return (
                        <div key={a.id} className="p-3 border-b last:border-0 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold">{client?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center">
                              <MapPin className="h-3 w-3 mr-1" /> {a.branch} · {format(parseISO(a.date), 'h:mm a')}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 opacity-70">
                            by {recorder?.name?.split(' ')[0] || 'Admin'}
                          </Badge>
                        </div>
                      );
                    })}
                  {attendances.filter(a => parseISO(a.date).toDateString() === new Date().toDateString()).length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-xs italic">
                      No attendance records for today yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
