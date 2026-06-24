import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../types/AuthContext';
import { supabase } from '../lib/supabase';
import { Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        toast.error('Erro ao cadastrar: ' + error.message);
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
        toast.error('Erro ao fazer login: ' + error.message);
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
              <input 
                type="password" 
                required
                className="w-full p-2 border border-white/10 rounded-md bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
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
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-primary hover:underline font-medium cursor-pointer"
              >
                {isRegistering ? 'Já tem uma conta? Faça login' : 'Ainda não tem conta? Cadastre-se'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
