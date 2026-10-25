-- ==============================================================================
-- GODSHOP / GESTÃO DE LOJA - SCRIPT DEFINITIVO DE CONFIGURAÇÃO DO SUPABASE
-- Execute este script no SQL Editor do seu Painel do Supabase (https://supabase.com/dashboard)
-- Este script é 100% IDEMPOTENTE: não apaga dados existentes, apenas cria tabelas e colunas faltantes.
-- ==============================================================================

-- 1. Habilitar extensões UUID e pgcrypto
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Tabela public_tokens (Pareamento de Dispositivos e Cadastro Remoto)
create table if not exists public.public_tokens (
    token text primary key,
    user_id uuid default 'df9c4051-e407-4fe4-8978-a6b9e6140ed9',
    used boolean default false,
    used_at timestamp with time zone,
    client_data jsonb default '{}'::jsonb,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.public_tokens add column if not exists user_id uuid default 'df9c4051-e407-4fe4-8978-a6b9e6140ed9';
alter table public.public_tokens add column if not exists used boolean default false;
alter table public.public_tokens add column if not exists used_at timestamp with time zone;
alter table public.public_tokens add column if not exists client_data jsonb default '{}'::jsonb;
alter table public.public_tokens add column if not exists expires_at timestamp with time zone;
alter table public.public_tokens add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

-- 3. Tabela public_sales (Contratos, Assinaturas Digitais e Vendas)
create table if not exists public.public_sales (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid default 'df9c4051-e407-4fe4-8978-a6b9e6140ed9',
    client_name text,
    sell_price numeric,
    buy_price numeric,
    iphone_id text,
    console_id text,
    payment_method text,
    sale_date timestamp with time zone default timezone('utc'::text, now()),
    signature_data text,
    signed_at timestamp with time zone,
    signed_ip text,
    witness1_name text,
    witness1_cpf text,
    witness1_signature text,
    witness2_name text,
    witness2_cpf text,
    witness2_signature text,
    sale_data jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.public_sales add column if not exists user_id uuid default 'df9c4051-e407-4fe4-8978-a6b9e6140ed9';
alter table public.public_sales add column if not exists client_name text;
alter table public.public_sales add column if not exists sell_price numeric;
alter table public.public_sales add column if not exists buy_price numeric;
alter table public.public_sales add column if not exists iphone_id text;
alter table public.public_sales add column if not exists console_id text;
alter table public.public_sales add column if not exists payment_method text;
alter table public.public_sales add column if not exists sale_date timestamp with time zone default timezone('utc'::text, now());
alter table public.public_sales add column if not exists signature_data text;
alter table public.public_sales add column if not exists signed_at timestamp with time zone;
alter table public.public_sales add column if not exists signed_ip text;
alter table public.public_sales add column if not exists witness1_name text;
alter table public.public_sales add column if not exists witness1_cpf text;
alter table public.public_sales add column if not exists witness1_signature text;
alter table public.public_sales add column if not exists witness2_name text;
alter table public.public_sales add column if not exists witness2_cpf text;
alter table public.public_sales add column if not exists witness2_signature text;
alter table public.public_sales add column if not exists sale_data jsonb default '{}'::jsonb;
alter table public.public_sales add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- 4. Tabela public_clients (Clientes Cadastrados)
create table if not exists public.public_clients (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid default 'df9c4051-e407-4fe4-8978-a6b9e6140ed9',
    name text,
    phone text,
    email text,
    cpf text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.public_clients add column if not exists user_id uuid default 'df9c4051-e407-4fe4-8978-a6b9e6140ed9';
alter table public.public_clients add column if not exists name text;
alter table public.public_clients add column if not exists phone text;
alter table public.public_clients add column if not exists email text;
alter table public.public_clients add column if not exists cpf text;

-- 5. Tabela app_settings (Configurações da Loja e Atendente)
create table if not exists public.app_settings (
    key text primary key,
    user_id uuid default 'df9c4051-e407-4fe4-8978-a6b9e6140ed9',
    value text,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.app_settings add column if not exists user_id uuid default 'df9c4051-e407-4fe4-8978-a6b9e6140ed9';
alter table public.app_settings add column if not exists value text;
alter table public.app_settings add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- 6. Configuração de RLS e Permissões de Acesso Público
alter table public.public_tokens enable row level security;
alter table public.public_sales enable row level security;
alter table public.public_clients enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "Enable all access for public_tokens" on public.public_tokens;
drop policy if exists "Enable all access for public_sales" on public.public_sales;
drop policy if exists "Enable all access for public_clients" on public.public_clients;
drop policy if exists "Enable all access for app_settings" on public.app_settings;

create policy "Enable all access for public_tokens" on public.public_tokens for all using (true) with check (true);
create policy "Enable all access for public_sales" on public.public_sales for all using (true) with check (true);
create policy "Enable all access for public_clients" on public.public_clients for all using (true) with check (true);
create policy "Enable all access for app_settings" on public.app_settings for all using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant all privileges on all tables in schema public to anon, authenticated;
grant all privileges on all sequences in schema public to anon, authenticated;
