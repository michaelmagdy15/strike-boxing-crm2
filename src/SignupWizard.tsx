import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Activity, Target, Flame, ChevronRight, CheckCircle2, Dumbbell } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { Checkbox } from '@/components/ui/checkbox';

interface SignupWizardProps {
  onBack: () => void;
}

export default function SignupWizard({ onBack }: SignupWizardProps) {
  const { registerFreeUser } = useAuth();
  const { branding } = useSettings();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('Moderately Active');
  
  const [workoutTimes, setWorkoutTimes] = useState<string[]>([]);
  const [fitnessTarget, setFitnessTarget] = useState('Improve Lifestyle');

  const timeOptions = ['Morning', 'Afternoon', 'Evening', 'Late Night'];

  const handleNext = () => {
    if (step === 1 && (!name || !phone || !email || !password)) {
      setError('Please fill in all basic details.');
      return;
    }
    if (step === 2 && (!age || !height || !weight)) {
      setError('Please fill in your metrics to help our AI Coach.');
      return;
    }
    setError('');
    setStep(s => s + 1);
  };

  const handlePrev = () => {
    if (step === 1) {
      onBack();
    } else {
      setStep(s => s - 1);
      setError('');
    }
  };

  const toggleTime = (time: string) => {
    setWorkoutTimes(prev => 
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workoutTimes.length === 0) {
      setError('Please select at least one workout time.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await registerFreeUser(email, password, {
        name,
        phone,
        age,
        gender,
        height: Number(height),
        weight: Number(weight),
        activityLevel,
        workoutTimes,
        fitnessTarget
      });
      // Registration successful! Firebase auth state will change and App.tsx will navigate away
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center flex flex-col items-center">
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.companyName} className="h-20 w-auto object-contain mb-4" />
        ) : (
          <h1 className="text-4xl font-black tracking-tight uppercase text-primary">
            {branding.companyName}
          </h1>
        )}
      </div>

      <Card className="w-full max-w-md shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 h-1 bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="-ml-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-xl">
                {step === 1 && "Start Your Journey"}
                {step === 2 && "Health Profile"}
                {step === 3 && "Fitness Goals"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Create a free account to access AI coaching."}
                {step === 2 && "Tell us about yourself to personalize your plan."}
                {step === 3 && "When and why do you want to train?"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-5">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
              </div>
            )}

            {/* STEP 2: Metrics */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 28" required min="10" max="120" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" required />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Activity Level</Label>
                  <Select value={activityLevel} onValueChange={setActivityLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sedentary">Sedentary (Office job)</SelectItem>
                      <SelectItem value="Lightly Active">Lightly Active (1-3 days/week)</SelectItem>
                      <SelectItem value="Moderately Active">Moderately Active (3-5 days/week)</SelectItem>
                      <SelectItem value="Very Active">Very Active (6-7 days/week)</SelectItem>
                      <SelectItem value="Extra Active">Extra Active (Athlete)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* STEP 3: Goals */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <Label>Preferred Workout Times</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {timeOptions.map(time => (
                      <div key={time} className={`flex items-center space-x-2 border rounded-md p-3 cursor-pointer transition-colors ${workoutTimes.includes(time) ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`} onClick={() => toggleTime(time)}>
                        <Checkbox checked={workoutTimes.includes(time)} onCheckedChange={() => toggleTime(time)} />
                        <span className="text-sm font-medium">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label>Primary Fitness Target</Label>
                  <div className="space-y-2">
                    {[
                      { id: 'Weight Loss', icon: Flame, desc: 'Burn fat and lean out' },
                      { id: 'Gain Muscle', icon: Dumbbell, desc: 'Build size and strength' },
                      { id: 'Improve Lifestyle', icon: Activity, desc: 'Overall health and mobility' },
                      { id: 'Maintenance', icon: Target, desc: 'Keep current shape' }
                    ].map(target => (
                      <div 
                        key={target.id}
                        onClick={() => setFitnessTarget(target.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${fitnessTarget === target.id ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-primary/50'}`}
                      >
                        <div className={`p-2 rounded-full ${fitnessTarget === target.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <target.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{target.id}</p>
                          <p className="text-xs text-muted-foreground">{target.desc}</p>
                        </div>
                        {fitnessTarget === target.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4">
              {step < 3 ? (
                <Button type="submit" className="w-full h-12 text-lg gap-2 group">
                  Next Step
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              ) : (
                <Button type="submit" className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 gap-2" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Complete Profile & Join'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
