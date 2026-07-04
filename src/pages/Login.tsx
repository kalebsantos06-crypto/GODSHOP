import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../types/AuthContext';
import { supabase } from '../lib/supabase';
import { Smartphone, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showOfflineOption, setShowOfflineOption] = useState(false);
  const { login, enterOfflineMode } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    document.body.classList.remove('overflow-hidden');
    document.body.classList.add('overflow-y-auto');
    return () => {
      document.body.classList.remove('overflow-y-auto');
      document.body.classList.add('overflow-hidden');
    };
  }, []);
  
  const handleOfflineLogin = async () => {
    setIsLoading(true);
    try {
      await enterOfflineMode(email);
      toast.success('Entrando em Modo Offline (Resiliência Local)');
      navigate('/');
    } catch (err) {
      toast.error('Erro ao acessar o modo offline.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowOfflineOption(false);
    
    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        const errorMsg = String(error.message || error).toLowerCase();
        const isNetwork = errorMsg.includes('failed to fetch') || errorMsg.includes('network') || errorMsg.includes('load') || errorMsg.includes('cors') || errorMsg.includes('typeerror');
        
        if (isNetwork) {
          toast.error('Erro de conexão: Não foi possível cadastrar no servidor.');
          setShowOfflineOption(true);
        } else {
          toast.error('Erro ao cadastrar: ' + error.message);
        }
        setIsLoading(false);
      } else {
        toast.success('Cadastro realizado com sucesso!');
        // Tenta fazer login automaticamente
        const { error: loginError } = await login(email, password);
        setIsLoading(false);
        if (!loginError) {
          navigate('/');
        } else {
          // Se precisar de confirmação de e-mail por exemplo:
          toast.info('Verifique se recebeu um e-mail de confirmação ou faça login.');
          setIsRegistering(false);
        }
      }
    } else {
      const { error } = await login(email, password);
      setIsLoading(false);
      if (error) {
        const errorMsg = String(error.message || error).toLowerCase();
        const isNetwork = errorMsg.includes('failed to fetch') || errorMsg.includes('network') || errorMsg.includes('load') || errorMsg.includes('cors') || errorMsg.includes('typeerror');
        
        if (isNetwork) {
          toast.error('Erro de conexão: Não foi possível contatar o servidor.');
          setShowOfflineOption(true);
        } else {
          toast.error('Erro ao fazer login: ' + error.message);
        }
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background blobs / metallic styling matching main style */}
      <div className="fixed inset-0 pointer-events-none opacity-45 mix-blend-screen z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-white/5 blur-[150px]"></div>
      </div>
      
      <Card className="w-full max-w-md backdrop-blur-md bg-card/30 border-white/10 z-10 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold tracking-tight">GODSHOP</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {isRegistering ? 'Crie uma nova conta de acesso' : 'Faça login para acessar o sistema'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">E-mail</label>
              <input 
                type="email" 
                required
                className="w-full p-2 border border-white/10 rounded-md bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent" 
                placeholder="exemplo@dominio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  className="w-full p-2 pr-10 border border-white/10 rounded-md bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent" 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              ) : (
                isRegistering ? 'Cadastrar e Entrar' : 'Entrar'
              )}
            </button>

            {showOfflineOption && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500 text-center space-y-2">
                <p>O servidor está inacessível no momento (rede instável ou offline).</p>
                <button
                  type="button"
                  onClick={handleOfflineLogin}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-1.5 px-3 rounded transition-colors cursor-pointer"
                >
                  Entrar em Modo Offline
                </button>
              </div>
            )}
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-primary hover:underline font-medium cursor-pointer"
              >
                {isRegistering ? 'Já tem uma conta? Faça login' : 'Ainda não tem conta? Cadastre-se'}
              </button>
            </div>

            <div className="text-center pt-2 border-t border-white/5 mt-2">
              <button
                type="button"
                onClick={handleOfflineLogin}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Trabalhar Offline (Sem Internet)
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
