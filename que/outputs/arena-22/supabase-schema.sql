-- Arena 22: execute este arquivo inteiro no SQL Editor do Supabase.
-- Ele cria uma agenda pública sem expor nome, telefone ou observações dos clientes.

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  court text not null check (court in ('Quadra 01', 'Quadra 02')),
  booking_date date not null check (booking_date >= current_date),
  booking_time time not null check (booking_time >= time '08:00' and booking_time <= time '22:00'),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 100),
  phone text not null check (char_length(trim(phone)) between 8 and 30),
  notes text not null default '' check (char_length(notes) <= 600),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Um pedido pendente já bloqueia o horário até a Arena confirmar ou cancelar.
create unique index if not exists bookings_one_active_slot
  on public.bookings (court, booking_date, booking_time)
  where status in ('pending', 'confirmed');

alter table public.bookings enable row level security;

-- A agenda pública enxerga apenas ocupação; dados pessoais continuam privados.
create or replace view public.public_availability as
  select court, booking_date, booking_time
  from public.bookings
  where status in ('pending', 'confirmed');

revoke all on table public.bookings from public, anon, authenticated;
revoke all on table public.public_availability from public, anon, authenticated;
grant select on public.public_availability to anon, authenticated;

-- A página chama somente esta função. Não há acesso público direto à tabela.
create or replace function public.request_booking(
  p_court text,
  p_booking_date date,
  p_booking_time time,
  p_customer_name text,
  p_phone text,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_booking_id uuid;
begin
  if p_court not in ('Quadra 01', 'Quadra 02') then
    raise exception 'Quadra inválida';
  end if;
  if p_booking_date < current_date then
    raise exception 'Data inválida';
  end if;
  if p_booking_time < time '08:00' or p_booking_time > time '22:00' then
    raise exception 'Horário inválido';
  end if;

  insert into public.bookings (court, booking_date, booking_time, customer_name, phone, notes)
  values (p_court, p_booking_date, p_booking_time, trim(p_customer_name), trim(p_phone), trim(coalesce(p_notes, '')))
  returning id into new_booking_id;

  return new_booking_id;
end;
$$;

revoke execute on function public.request_booking(text, date, time, text, text, text) from public;
grant execute on function public.request_booking(text, date, time, text, text, text) to anon, authenticated;
