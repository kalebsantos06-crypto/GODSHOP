import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../types/AuthContext';
import { Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  
  const [bgImage, setBgImage] = useState<string>('/background.jpg');
  const [logoImage, setLogoImage] = useState<string | null>(null);

  React.useEffect(() => {
    setBgImage(localStorage.getItem('app_background') || '/background.jpg');
    setLogoImage(localStorage.getItem('app_logo') || null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await login(email, password);
    setIsLoading(false);
    if (error) {
      toast.error('Erro ao fazer login: ' + error.message);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed p-4 text-foreground" style={{ backgroundImage: `url(${bgImage})`, backgroundColor: '#000' }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none"></div>
      <Card className="w-full max-w-md relative z-10 bg-card/90 backdrop-blur-md border-white/10">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-2">
            <div className="p-4 bg-primary/10 rounded-3xl shadow-lg border border-white/5">
              {logoImage ? (
                <img src={logoImage} alt="Logo" className="h-24 w-24 sm:h-32 sm:w-32 object-contain rounded-2xl" />
              ) : (
                <Smartphone className="h-16 w-16 sm:h-20 sm:w-20 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold tracking-tight">GODSHOP</CardTitle>
          <CardDescription className="text-sm sm:text-base">Faça login para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input 
                type="email" 
                required
                className="w-full p-2 border border-white/10 rounded-md bg-background/50 text-foreground placeholder:text-muted-foreground" 
                placeholder="admin@godshop.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <input 
                type="password" 
                required
                className="w-full p-2 border border-white/10 rounded-md bg-background/50 text-foreground placeholder:text-muted-foreground" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
