const config = window.ARENA_CONFIG || {};
const bookingForm = document.querySelector('#booking-form');
const bookingFeedback = document.querySelector('#booking-feedback');
const availabilityDateInput = document.querySelector('#availability-date');
const availabilityGrid = document.querySelector('#availability-grid');
const availabilityStatus = document.querySelector('#availability-status');
const bookingCourtInput = document.querySelector('#booking-court');
const bookingDateInput = document.querySelector('#booking-date');
const bookingTimeInput = document.querySelector('#booking-time');
const selectedSlotText = document.querySelector('#selected-slot-text');
const teamForm = document.querySelector('#team-form');
const playersInput = document.querySelector('#players');
const teamsCountInput = document.querySelector('#teams-count');
const teamSizeInput = document.querySelector('#team-size');
const results = document.querySelector('#team-results');
const courts = ['Quadra 01', 'Quadra 02'];
const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const supabaseClient = config.supabaseUrl && config.supabaseAnonKey && window.supabase
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;
let occupiedSlots = new Set();
let selectedBookingSlot = null;

document.querySelector('#year').textContent = new Date().getFullYear();

document.querySelector('.menu-toggle').addEventListener('click', (event) => {
  const navigation = document.querySelector('#nav');
  const isOpen = navigation.classList.toggle('is-open');
  event.currentTarget.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.nav a').forEach((link) => link.addEventListener('click', () => {
  document.querySelector('#nav').classList.remove('is-open');
  document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
}));

availabilityDateInput.min = getTodayISO();
availabilityDateInput.value = getTodayISO();
availabilityDateInput.addEventListener('change', () => {
  clearSelectedSlot();
  loadAvailability();
});
document.querySelector('#refresh-availability').addEventListener('click', loadAvailability);
availabilityGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-court][data-time]');
  if (!button || button.disabled) return;
  selectBookingSlot(button.dataset.court, button.dataset.time);
});

loadAvailability();

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const action = event.submitter?.dataset.channel || 'whatsapp';
  const form = new FormData(bookingForm);
  if (!selectedBookingSlot) {
    bookingFeedback.textContent = 'Escolha primeiro uma quadra e um horário disponíveis na agenda.';
    return;
  }
  if (!supabaseClient) {
    bookingFeedback.textContent = 'A agenda ainda não foi conectada ao banco de dados. Configure o Supabase no arquivo config.js.';
    return;
  }

  setBookingLoading(true);
  const { error } = await supabaseClient.rpc('request_booking', {
    p_court: selectedBookingSlot.court,
    p_booking_date: selectedBookingSlot.date,
    p_booking_time: selectedBookingSlot.time,
    p_customer_name: form.get('nome'),
    p_phone: form.get('telefone'),
    p_notes: form.get('observacoes') || '',
  });

  if (error) {
    setBookingLoading(false);
    if (error.code === '23505') {
      bookingFeedback.textContent = 'Esse horário acabou de ser reservado. Atualizamos a agenda; escolha outro horário.';
      clearSelectedSlot();
      loadAvailability();
    } else {
      bookingFeedback.textContent = 'Não foi possível salvar o pedido agora. Tente novamente em instantes.';
    }
    return;
  }

  const date = formatDate(selectedBookingSlot.date);
  const message = [
    'Olá, Arena 22! Gostaria de solicitar uma reserva:',
    `Nome: ${form.get('nome')}`,
    `Telefone: ${form.get('telefone')}`,
    `Quadra: ${form.get('quadra')}`,
    `Data: ${date}`,
    `Horário: ${form.get('horario')}`,
    form.get('observacoes') ? `Observações: ${form.get('observacoes')}` : '',
  ].filter(Boolean).join('\n');

  if (action === 'whatsapp' && config.whatsappNumber) {
    window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    bookingFeedback.textContent = 'Pré-reserva salva como pendente. Abrimos uma mensagem no WhatsApp para você concluir o atendimento.';
  } else if (action === 'email' && config.bookingEmail) {
    window.location.href = `mailto:${config.bookingEmail}?subject=${encodeURIComponent('Pedido de reserva — Arena 22')}&body=${encodeURIComponent(message)}`;
    bookingFeedback.textContent = 'Pré-reserva salva como pendente. Abrimos seu aplicativo de e-mail.';
  } else {
    bookingFeedback.textContent = `Pré-reserva salva como pendente. Para ativar este canal de atendimento, informe o ${action === 'whatsapp' ? 'WhatsApp' : 'e-mail'} da Arena no arquivo config.js.`;
  }
  bookingForm.reset();
  clearSelectedSlot();
  setBookingLoading(false);
  loadAvailability();
});

function getTodayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`));
}

function formatDbTime(value) {
  return String(value).slice(0, 5);
}

function slotKey(court, time) {
  return `${court}|${formatDbTime(time)}`;
}

function setAvailabilityStatus(message, mode = '') {
  availabilityStatus.textContent = message;
  availabilityStatus.className = `availability-status ${mode}`;
}

async function loadAvailability() {
  clearSelectedSlot();
  if (!supabaseClient) {
    availabilityGrid.innerHTML = '<div class="availability-empty"><strong>Agenda sendo preparada</strong><span>Conecte o Supabase para exibir horários livres e indisponíveis em tempo real.</span></div>';
    setAvailabilityStatus('Aguardando conexão', 'is-warning');
    return;
  }

  setAvailabilityStatus('Atualizando', 'is-loading');
  availabilityGrid.setAttribute('aria-busy', 'true');
  const { data, error } = await supabaseClient
    .from('public_availability')
    .select('court, booking_time')
    .eq('booking_date', availabilityDateInput.value);
  availabilityGrid.removeAttribute('aria-busy');

  if (error) {
    availabilityGrid.innerHTML = '<div class="availability-empty"><strong>Não foi possível carregar a agenda</strong><span>Confira a conexão com o Supabase e tente atualizar.</span></div>';
    setAvailabilityStatus('Conexão indisponível', 'is-error');
    return;
  }

  occupiedSlots = new Set(data.map((booking) => slotKey(booking.court, booking.booking_time)));
  renderAvailability();
  setAvailabilityStatus('Agenda atualizada', 'is-ready');
}

function renderAvailability() {
  availabilityGrid.innerHTML = courts.map((court) => {
    const slots = timeSlots.map((time) => {
      const busy = occupiedSlots.has(slotKey(court, time));
      return `<button type="button" class="time-slot ${busy ? 'is-busy' : 'is-available'}" data-court="${court}" data-time="${time}" ${busy ? 'disabled aria-label="' + court + ', ' + time + ', indisponível"' : 'aria-label="' + court + ', ' + time + ', disponível"'}>${time}</button>`;
    }).join('');
    return `<section class="court-schedule"><h4>${court}</h4><div class="time-slots">${slots}</div></section>`;
  }).join('');
}

function selectBookingSlot(court, time) {
  selectedBookingSlot = { court, time, date: availabilityDateInput.value };
  bookingCourtInput.value = court;
  bookingDateInput.value = availabilityDateInput.value;
  bookingTimeInput.value = time;
  selectedSlotText.textContent = `${court} · ${formatDate(availabilityDateInput.value)} às ${time}`;
  document.querySelectorAll('.time-slot').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.court === court && button.dataset.time === time);
    button.setAttribute('aria-pressed', String(button.dataset.court === court && button.dataset.time === time));
  });
  bookingFeedback.textContent = '';
}

function clearSelectedSlot() {
  selectedBookingSlot = null;
  bookingCourtInput.value = '';
  bookingDateInput.value = '';
  bookingTimeInput.value = '';
  selectedSlotText.textContent = 'Escolha um horário acima';
  document.querySelectorAll('.time-slot.is-selected').forEach((button) => button.classList.remove('is-selected'));
}

function setBookingLoading(isLoading) {
  bookingForm.querySelectorAll('button[type="submit"]').forEach((button) => { button.disabled = isLoading; });
}

const samplePlayers = `João (G)
Pedro
Rafael
Lucas
Matheus
Bruno (G)
Diego
Gabriel
Felipe
Vinícius
Gustavo
André`;

document.querySelector('#demo-button').addEventListener('click', () => {
  playersInput.value = samplePlayers;
  teamForm.requestSubmit();
});

teamForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const players = parsePlayers(playersInput.value);
  const teamsCount = Number(teamsCountInput.value);
  const teamSize = Number(teamSizeInput.value);
  const required = teamsCount * teamSize;

  if (players.length < required) {
    renderMessage(`Para montar ${teamsCount} times de ${teamSize}, adicione pelo menos ${required} jogadores. Você inseriu ${players.length}.`, true);
    return;
  }

  const draw = buildTeams(players, teamsCount, teamSize);
  renderTeams(draw.teams, draw.reserves);
});

function parsePlayers(text) {
  const seen = new Set();
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const goalkeeper = /(?:\s|^)[\[(](?:g|gol|goleiro)[\])](?:\s|$)/i.test(line);
    return { name: line.replace(/\s*[\[(](?:g|gol|goleiro)[\])]/ig, '').trim(), goalkeeper };
  }).filter((player) => {
    const key = player.name.toLocaleLowerCase('pt-BR');
    if (!player.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const random = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[random]] = [copy[random], copy[index]];
  }
  return copy;
}

function buildTeams(players, teamsCount, teamSize) {
  const goalkeepers = shuffle(players.filter((player) => player.goalkeeper));
  const others = shuffle(players.filter((player) => !player.goalkeeper));
  const teams = Array.from({ length: teamsCount }, (_, index) => ({
    name: `Time ${index + 1}`,
    players: [],
  }));

  // Primeiro distribui os goleiros marcados. Os excedentes voltam à lista geral.
  teams.forEach((team) => {
    const goalkeeper = goalkeepers.shift();
    if (goalkeeper) team.players.push({ ...goalkeeper, assignedGoalkeeper: true });
  });
  const available = shuffle([...goalkeepers, ...others]);
  let cursor = 0;
  teams.forEach((team) => {
    while (team.players.length < teamSize && cursor < available.length) {
      team.players.push({ ...available[cursor], assignedGoalkeeper: false });
      cursor += 1;
    }
    if (!team.players.some((player) => player.assignedGoalkeeper)) {
      const goalkeeperIndex = Math.floor(Math.random() * team.players.length);
      team.players[goalkeeperIndex].assignedGoalkeeper = true;
    }
    team.players = shuffle(team.players);
  });

  return { teams, reserves: available.slice(cursor) };
}

function renderMessage(message, isError = false) {
  results.innerHTML = `<div class="empty-state ${isError ? 'is-error' : ''}"><span aria-hidden="true">!</span><h3>Falta pouca coisa</h3><p>${message}</p></div>`;
}

function renderTeams(teams, reserves) {
  const cards = teams.map((team, teamIndex) => `
    <article class="team-card team-${teamIndex + 1}">
      <div class="team-card-head"><span>${String(teamIndex + 1).padStart(2, '0')}</span><h3>${team.name}</h3><small>${team.players.length} jogadores</small></div>
      <ol>${team.players.map((player) => `<li class="${player.assignedGoalkeeper ? 'goalkeeper' : ''}"><span>${player.assignedGoalkeeper ? 'G' : '•'}</span>${escapeHtml(player.name)}${player.assignedGoalkeeper ? '<small>Goleiro</small>' : ''}</li>`).join('')}</ol>
    </article>`).join('');
  const reserveCard = reserves.length ? `<article class="reserve-card"><h3>Reservas <span>${reserves.length}</span></h3><p>${reserves.map((player) => escapeHtml(player.name)).join(' · ')}</p></article>` : '';
  const shareText = teams.map((team) => `${team.name}:\n${team.players.map((player) => `${player.assignedGoalkeeper ? '🧤 ' : ''}${player.name}`).join('\n')}`).join('\n\n');
  results.innerHTML = `<div class="teams-list">${cards}</div>${reserveCard}<button id="copy-teams" class="share-button" type="button">Copiar escalação <span aria-hidden="true">⧉</span></button>`;
  document.querySelector('#copy-teams').addEventListener('click', async (event) => {
    try {
      await navigator.clipboard.writeText(shareText);
      event.currentTarget.textContent = 'Escalação copiada!';
    } catch {
      event.currentTarget.textContent = 'Não foi possível copiar';
    }
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}
