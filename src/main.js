import { createClient } from '@supabase/supabase-js'

// ════════════════════════════════
// CONFIG
// ════════════════════════════════
const SB_URL = "https://qxsojquzoifvsarmktvk.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c29qcXV6b2lmdnNhcm1rdHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDc1NTIsImV4cCI6MjA5NDc4MzU1Mn0.C6snaKaQmENwSKczZbwWU3nMGCgWs6fDNTajWcwqTDQ"
const sb = createClient(SB_URL, SB_KEY)

// ════════════════════════════════
// STATE
// ════════════════════════════════
let FC = '', FN = '', ME = '', items = [], chan = null, members = [], editMembers = false

// ════════════════════════════════
// UTILS
// ════════════════════════════════
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const fmt = p => p ? Number(p).toFixed(2).replace('.',',') + ' €' : ''

function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(t._t)
  t._t = setTimeout(() => t.classList.remove('show'), 2500)
}

function setSync(label, on) {
  const el = document.getElementById('sync-label')
  const dot = document.getElementById('dot')
  if (el) el.textContent = label
  if (dot) dot.className = 'dot' + (on === true ? ' on' : on === false ? ' off' : '')
}

// ════════════════════════════════
// ONBOARDING
// ════════════════════════════════
function showCreate() {
  document.getElementById('card-create').style.display = 'block'
  document.getElementById('card-join').style.display = 'none'
}

function showJoin() {
  document.getElementById('card-create').style.display = 'none'
  document.getElementById('card-join').style.display = 'block'
}

async function doCreate() {
  const fn = document.getElementById('inp-family').value.trim()
  const pr = document.getElementById('inp-prenom-create').value.trim()
  if (!fn || !pr) { toast('Remplis tous les champs'); return }
  toast('Création en cours…')
  const code = Math.random().toString(36).substring(2,8).toUpperCase()
  const { error } = await sb.from('pf_members').insert([{ family_code: code, family_name: fn, prenom: pr }])
  if (error) { toast('Erreur : ' + error.message); return }
  localStorage.setItem('pf_code', code)
  localStorage.setItem('pf_family', fn)
  localStorage.setItem('pf_prenom', pr)
  startApp(code, fn, pr)
}

async function doJoin() {
  const code = document.getElementById('inp-code').value.trim().toUpperCase()
  const pr = document.getElementById('inp-prenom-join').value.trim()
  if (!code || !pr) { toast('Remplis tous les champs'); return }
  if (code.length !== 6) { toast('Code à 6 caractères'); return }
  toast('Connexion en cours…')
  const { data, error } = await sb.from('pf_members').select('family_name').eq('family_code', code).limit(1)
  if (error || !data || !data.length) { toast('Code famille introuvable'); return }
  const fn = data[0].family_name
  await sb.from('pf_members').insert([{ family_code: code, family_name: fn, prenom: pr }])
  localStorage.setItem('pf_code', code)
  localStorage.setItem('pf_family', fn)
  localStorage.setItem('pf_prenom', pr)
  startApp(code, fn, pr)
}

// ════════════════════════════════
// APP
// ════════════════════════════════
function startApp(code, fn, pr) {
  FC = code; FN = fn; ME = pr
  document.getElementById('onboarding').classList.remove('visible')
  document.getElementById('app').classList.add('visible')
  const h = new Date().getHours()
  const msg = h < 6 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
  document.getElementById('g-name').textContent = pr
  document.getElementById('g-msg').textContent = msg + ', ' + pr + ' !'
  document.getElementById('g-family').textContent = 'Famille ' + fn
  document.getElementById('code-display').textContent = code
  loadMembers()
  loadWeather()
  loadItems()
}

function copyCode() {
  navigator.clipboard.writeText(FC).then(() => toast('Code copié !')).catch(() => toast(FC))
}

function shareInvite() {
  const url = 'https://ponk-family.vercel.app'
  const text = 'Rejoins notre espace famille Ponk Family ! Code : ' + FC + '\n' + url
  if (navigator.share) {
    navigator.share({ title: 'Ponk Family', text })
  } else {
    navigator.clipboard.writeText(text).then(() => toast('Lien copié !')).catch(() => toast(text))
  }
}

function logout() {
  if (!confirm('Se déconnecter ?')) return
  localStorage.removeItem('pf_code')
  localStorage.removeItem('pf_family')
  localStorage.removeItem('pf_prenom')
  location.reload()
}

async function loadMembers() {
  const { data } = await sb.from('pf_members').select('prenom').eq('family_code', FC)
  if (!data) return
  members = data
  renderMembers()
}

function renderMembers() {
  const membersCard = document.querySelector('.members-card')
  membersCard.innerHTML = `
    <div class="members-title" style="display:flex;align-items:center;justify-content:space-between">
      <span>Membres</span>
      <button id="btn-toggle-edit" style="background:none;border:none;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;color:${editMembers ? 'var(--green)' : 'var(--blue)'}">
        ${editMembers ? 'Terminer' : 'Modifier'}
      </button>
    </div>
    <div id="members-list">
      ${members.map(m => `
        <div class="member-row">
          <div class="member-av">${esc(m.prenom[0].toUpperCase())}</div>
          <div style="flex:1"><div class="member-name">${esc(m.prenom)}</div></div>
          ${editMembers
            ? `<button class="del-member" data-prenom="${esc(m.prenom)}"
                style="background:#FFF0F0;border:none;cursor:pointer;color:#FF3B30;font-size:18px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">×</button>`
            : ''}
        </div>`).join('')}
      ${editMembers ? `<div style="padding:12px 16px;border-top:0.5px solid var(--border)">
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" id="new-member-input" placeholder="Prénom du membre…" autocorrect="off"
            style="flex:1;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:10px 12px;font-size:14px;color:var(--text);outline:none;font-family:inherit" />
          <button id="new-member-btn"
            style="background:var(--green);border:none;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:white;font-size:22px;font-weight:300;line-height:1">+</button>
        </div>
      </div>` : ''}
    </div>`

  document.getElementById('btn-toggle-edit').addEventListener('click', () => {
    editMembers = !editMembers
    renderMembers()
  })

  document.querySelectorAll('.del-member').forEach(btn => {
    btn.addEventListener('click', async () => {
      const prenom = btn.dataset.prenom
      if (!confirm('Supprimer ' + prenom + ' ?')) return
      await sb.from('pf_members').delete().eq('family_code', FC).eq('prenom', prenom)
      await loadMembers()
    })
  })

  if (editMembers) {
    const input = document.getElementById('new-member-input')
    const btn = document.getElementById('new-member-btn')
    if (btn) btn.addEventListener('click', async () => {
      const prenom = input ? input.value.trim() : ''
      if (!prenom) return
      await sb.from('pf_members').insert([{ family_code: FC, family_name: FN, prenom }])
      if (input) input.value = ''
      await loadMembers()
    })
    if (input) input.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('new-member-btn')?.click()
    })
  }
}

// ════════════════════════════════
// MÉTÉO
// ════════════════════════════════
function loadWeather() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const { latitude: lat, longitude: lon } = pos.coords
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`)
      const d = await r.json()
      const temp = Math.round(d.current.temperature_2m)
      const wi = winfo(d.current.weathercode)
      let city = ''
      try {
        const g = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        const gd = await g.json()
        city = gd.address.city || gd.address.town || gd.address.village || ''
      } catch(e) {}
      document.getElementById('meteo').innerHTML = `
        <div class="meteo-row">
          <div class="meteo-icon">${wi.icon}</div>
          <div>
            <div class="meteo-temp">${temp}°C</div>
            <div class="meteo-desc">${wi.desc}</div>
            ${city ? `<div class="meteo-city">${esc(city)}</div>` : ''}
          </div>
        </div>`
    } catch(e) {}
  }, () => {})
}

function winfo(c) {
  if (c===0) return {icon:'☀️',desc:'Ciel dégagé'}
  if (c<=2)  return {icon:'🌤️',desc:'Partiellement nuageux'}
  if (c<=3)  return {icon:'☁️',desc:'Nuageux'}
  if (c<=49) return {icon:'🌫️',desc:'Brouillard'}
  if (c<=69) return {icon:'🌧️',desc:'Pluie'}
  if (c<=79) return {icon:'❄️',desc:'Neige'}
  return {icon:'⛈️',desc:'Orage'}
}

// ════════════════════════════════
// COURSES
// ════════════════════════════════
async function loadItems() {
  setSync('Connexion…', null)
  const { data, error } = await sb.from('pf_courses').select('*').eq('family_code', FC).order('created_at', { ascending: true })
  if (error) { setSync('Erreur', false); return }
  items = data || []
  renderCourses()
}

async function addItem() {
  const ni = document.getElementById('new-item')
  const pi = document.getElementById('price-input')
  const name = ni.value.trim()
  if (!name) return

  // Detect category
  const cat = detectCat(name)
  
  // Estimate price
  let price = null
  if (pi.value) {
    price = parseFloat(pi.value)
    savePrice(name, pi.value)
  } else {
    price = defPrice(name) || estimatePriceByCat(cat.id)
  }

  ni.value = ''; pi.value = ''
  document.getElementById('suggest').innerHTML = ''

  // If category is "Autre", ask user to pick category
  if (cat.id === 'au') {
    askCategory(name, price)
    return
  }

  const { error } = await sb.from('pf_courses').insert([{ name, checked: false, family_code: FC, price, quantity: 1 }])
  if (error) { toast('Erreur : ' + error.message); return }
  await loadItems()
}

function estimatePriceByCat(catId) {
  const catKeys = CATS.find(c => c.id === catId)?.keys || []
  const prices = Object.entries(DEF).filter(([name]) => {
    const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return catKeys.some(k => n.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
  }).map(([, p]) => p)
  if (!prices.length) return null
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100
}

function askCategory(name, price) {
  // Show category picker modal
  const modal = document.createElement('div')
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:flex-end;justify-content:center'
  modal.innerHTML = `
    <div style="background:white;border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;max-width:480px">
      <div style="font-size:16px;font-weight:700;margin-bottom:4px">Catégorie pour "${name}"</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px">On n'a pas reconnu ce produit. Choisis sa catégorie :</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${CATS.map(c => `<button data-cat="${c.id}" style="background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:10px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
          ${c.icon} ${c.label}
        </button>`).join('')}
      </div>
    </div>`
  document.body.appendChild(modal)
  modal.querySelectorAll('button[data-cat]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const catId = btn.dataset.cat
      const estimatedPrice = price || estimatePriceByCat(catId)
      document.body.removeChild(modal)
      const { error } = await sb.from('pf_courses').insert([{ name, checked: false, family_code: FC, price: estimatedPrice, quantity: 1, category: catId }])
      if (error) { toast('Erreur : ' + error.message); return }
      await loadItems()
    })
  })
  modal.addEventListener('click', e => { if (e.target === modal) document.body.removeChild(modal) })
}

async function toggleItem(id, checked) {
  await sb.from('pf_courses').update({ checked: !checked }).eq('id', id)
  await loadItems()
}

async function updateQty(id, delta) {
  const item = items.find(i => i.id === id)
  if (!item) return
  const newQty = Math.max(1, (item.quantity || 1) + delta)
  await sb.from('pf_courses').update({ quantity: newQty }).eq('id', id)
  await loadItems()
}

function editPrice(el) {
  // If it's a no-price element, just open editor - don't block toggle for items with price
  const id = el.dataset.id
  const currentPrice = el.dataset.price || ''
  const input = document.createElement('input')
  input.type = 'number'
  input.step = '0.01'
  input.min = '0'
  input.value = currentPrice
  input.placeholder = '0,00'
  input.style.cssText = 'width:60px;border:1.5px solid var(--green);border-radius:8px;padding:3px 6px;font-family:inherit;font-size:13px;font-weight:600;text-align:center;outline:none;background:white;color:var(--text)'
  el.replaceWith(input)
  input.focus()
  input.select()
  async function confirmEdit() {
    const newPrice = input.value ? parseFloat(input.value) : null
    await sb.from('pf_courses').update({ price: newPrice }).eq('id', id)
    if (newPrice) savePrice(items.find(i => i.id === id)?.name || '', newPrice)
    await loadItems()
  }
  input.addEventListener('blur', confirmEdit)
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { input.blur() } })
}

async function deleteItem(id) {
  await sb.from('pf_courses').delete().eq('id', id)
  await loadItems()
}

async function clearChecked() {
  const ids = items.filter(i => i.checked).map(i => i.id)
  if (!ids.length) return
  await sb.from('pf_courses').delete().in('id', ids)
  await loadItems()
}

async function resetChecked() {
  const ids = items.filter(i => i.checked).map(i => i.id)
  if (!ids.length) return
  await sb.from('pf_courses').update({ checked: false }).in('id', ids)
  await loadItems()
  toast('Liste remise à zéro')
}



// ════════════════════════════════
// CATÉGORIES
// ════════════════════════════════
const CATS = [
  { id:'fl', label:'Fruits & Légumes', icon:'🥦', keys:['pomme','poire','banane','orange','citron','raisin','fraise','cerise','peche','abricot','melon','pasteque','ananas','mangue','kiwi','framboise','myrtille','prune','avocat','carotte','pomme de terre','tomate','concombre','courgette','poivron','aubergine','oignon','ail','poireau','brocoli','chou','laitue','salade','epinard','haricot vert','petits pois','mais','champignon','radis','betterave','navet','celeri','fenouil','artichaut','asperge','patate','persil','basilic','coriandre','menthe','thym','romarin','ciboulette','gingembre','piment','roquette','mache','endive','butternut','potiron'] },
  { id:'vp', label:'Viande & Poisson', icon:'🥩', keys:['poulet','boeuf','veau','porc','agneau','dinde','canard','lapin','jambon','lardons','bacon','saucisse','merguez','chipolata','steak','escalope','roti','viande','saumon','thon','cabillaud','truite','sardine','maquereau','crevette','moule','huitre','saint-jacques','dorade','bar','merlu','lieu','colin','calamar','homard','langoustine','crabe','surimi','magret','confit','filet de poisson','anchois'] },
  { id:'lt', label:'Produits laitiers', icon:'🥛', keys:['oeuf','lait','yaourt','fromage','beurre','creme fraiche','creme liquide','emmental','gruyere','camembert','brie','roquefort','mozzarella','parmesan','comte','reblochon','munster','ricotta','mascarpone','feta','skyr','fromage blanc','burrata','kiri','babybel','gouda','cheddar'] },
  { id:'bo', label:'Boulangerie', icon:'🥖', keys:['pain','baguette','brioche','croissant','madeleine','cookie','sable','biscotte','cracker','pate brisee','pate feuilletee','pate a pizza','pain de mie','pain complet'] },
  { id:'ep', label:'Épicerie', icon:'🥫', keys:['pates','riz','semoule','quinoa','lentille','pois chiche','sauce tomate','coulis','concentre de tomate','soupe','bouillon','huile','vinaigre','moutarde','ketchup','mayonnaise','sel','poivre','sucre','farine','maizena','levure','chocolat','cacao','cafe','the','tisane','confiture','miel','nutella','chips','noix','amande','noisette','cacahuete','pistache','cereales','muesli','flocon','compote','boulgour','curry','paprika','cumin','curcuma','cannelle','origan','pesto','tabasco','sauce soja'] },
  { id:'bv', label:'Boissons', icon:'🥤', keys:['eau','jus','soda','coca','pepsi','limonade','biere','vin','champagne','cidre','whisky','rhum','vodka','gin','aperitif','smoothie','nectar','orangina','perrier','schweppes','fanta','sprite'] },
  { id:'sg', label:'Surgelés', icon:'🧊', keys:['surgele','surgelee','glace','sorbet','frite','nugget','hachis parmentier','pizza surgelee'] },
  { id:'hy', label:'Hygiène & Beauté', icon:'🧴', keys:['shampoing','gel douche','savon','dentifrice','brosse a dent','rasoir','deodorant','creme','coton','tampon','serviette hygienique','couche','lingette','mouchoir'] },
  { id:'mn', label:'Entretien', icon:'🧹', keys:['lessive','liquide vaisselle','nettoyant','javel','essuie tout','papier toilette','sac poubelle','eponge','assouplissant','pastille lave'] },
  { id:'bb', label:'Bébé', icon:'👶', keys:['lait maternise','petit pot','compote bebe','biscuit bebe','biberon','tetine','couche taille'] },
  { id:'an', label:'Animaux', icon:'🐾', keys:['croquette','patee chien','patee chat','litiere','friandise chien','friandise chat'] },
]

function detectCat(name, storedCat) {
  if (storedCat) {
    const found = CATS.find(c => c.id === storedCat)
    if (found) return found
  }
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const c of CATS) {
    if (c.keys.some(k => n.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) return c
  }
  return { id:'au', label:'Autre', icon:'🛒' }
}

// ════════════════════════════════
// PRIX
// ════════════════════════════════
const DEF = {"Oeufs":2.50,"Oeufs bio":3.50,"Oeufs fermiers":3.00,"Pomme":0.30,"Poire":0.40,"Banane":0.25,"Orange":0.50,"Citron":0.40,"Fraise":3.50,"Cerise":4.00,"Pêche":0.60,"Abricot":0.50,"Melon":2.50,"Ananas":2.00,"Mangue":1.50,"Kiwi":0.40,"Framboise":3.50,"Myrtille":3.00,"Avocat":1.20,"Carotte":1.20,"Pomme de terre":1.50,"Tomate":2.00,"Tomate cerise":2.50,"Concombre":0.80,"Courgette":1.00,"Poivron rouge":1.20,"Aubergine":1.20,"Oignon":1.00,"Ail":0.80,"Poireau":1.50,"Brocoli":1.80,"Laitue":1.20,"Épinard":2.00,"Haricots verts":2.50,"Champignons de Paris":2.00,"Patate douce":1.80,"Poulet entier":7.00,"Blanc de poulet":6.00,"Cuisses de poulet":4.00,"Boeuf haché":7.00,"Steak":10.00,"Entrecôte":14.00,"Filet de boeuf":22.00,"Côte de porc":8.00,"Filet mignon de porc":10.00,"Gigot d'agneau":18.00,"Escalope de dinde":7.00,"Magret de canard":12.00,"Jambon blanc":2.50,"Jambon cru":3.50,"Chorizo":3.00,"Lardons":2.00,"Saucisses de Strasbourg":2.50,"Merguez":3.50,"Chipolatas":3.50,"Saumon frais":15.00,"Saumon fumé":5.00,"Thon en boîte":1.80,"Cabillaud":14.00,"Sardines en boîte":1.50,"Crevettes roses":8.00,"Gambas":12.00,"Moules":3.50,"Lait demi-écrémé":1.10,"Lait entier":1.20,"Yaourt nature":1.50,"Yaourt aux fruits":2.00,"Yaourt grec":2.20,"Fromage blanc":1.50,"Beurre doux":2.20,"Crème fraîche épaisse":1.50,"Crème liquide":1.20,"Emmental":3.50,"Gruyère":4.00,"Comté":5.00,"Camembert":2.20,"Brie":3.00,"Mozzarella":1.80,"Parmesan":4.50,"Reblochon":4.00,"Feta":3.00,"Ricotta":2.00,"Mascarpone":2.50,"Baguette":1.10,"Pain complet":2.00,"Pain de mie":1.80,"Brioche":2.50,"Croissants":3.50,"Pâtes spaghetti":1.20,"Pâtes penne":1.20,"Riz basmati":2.50,"Quinoa":3.50,"Lentilles vertes":2.00,"Pois chiches":1.80,"Sauce tomate":1.20,"Huile d'olive":5.00,"Moutarde de Dijon":1.80,"Ketchup":1.50,"Mayonnaise":2.00,"Sel fin":0.50,"Sucre blanc":1.20,"Miel":4.00,"Confiture fraise":2.50,"Nutella":4.00,"Farine de blé":1.20,"Chocolat noir":2.50,"Café moulu":4.50,"Thé noir":3.50,"Chips nature":1.80,"Amandes":5.00,"Flocons d'avoine":2.00,"Bouillon de légumes":1.50,"Eau plate 1,5L":0.40,"Eau gazeuse":0.60,"Jus d'orange":2.50,"Coca-Cola":1.80,"Bière blonde":1.20,"Vin rouge":5.00,"Vin blanc":5.00,"Champagne":18.00,"Pizza surgelée":3.50,"Frites surgelées":2.50,"Glace vanille":3.50,"Shampoing":3.50,"Gel douche":2.80,"Dentifrice":2.50,"Déodorant":3.00,"Serviettes hygiéniques":3.50,"Couches":14.00,"Mouchoirs":2.00,"Lessive liquide":6.00,"Liquide vaisselle":2.50,"Pastilles lave-vaisselle":8.00,"Javel":1.50,"Essuie-tout":3.50,"Papier toilette":5.00,"Sacs poubelle":3.00,"Lait maternisé":12.00,"Croquettes chien":8.00,"Croquettes chat":6.00,"Litière chat":5.00}

function defPrice(name) {
  return DEF[name] !== undefined ? DEF[name] : (getSavedPrices()[name] || null)
}
function getSavedPrices() {
  try { return JSON.parse(localStorage.getItem('pf_prices') || '{}') } catch(e) { return {} }
}
function savePrice(name, p) {
  const s = getSavedPrices(); s[name] = parseFloat(p); localStorage.setItem('pf_prices', JSON.stringify(s))
}

// ════════════════════════════════
// SUGGESTIONS
// ════════════════════════════════
const PRODS = ["Pomme","Pomme Granny Smith","Pomme Golden","Poire","Poire Williams","Banane","Orange","Orange à jus","Citron","Citron vert","Raisin blanc","Raisin noir","Fraise","Cerise","Pêche","Nectarine","Abricot","Melon","Pastèque","Ananas","Mangue","Kiwi","Framboise","Myrtille","Mûre","Prune","Mirabelle","Figue","Avocat","Clémentine","Mandarine","Pamplemousse","Litchi","Grenade","Carotte","Pomme de terre","Tomate","Tomate cerise","Tomate grappe","Concombre","Courgette","Poivron rouge","Poivron vert","Poivron jaune","Aubergine","Oignon","Oignon rouge","Échalote","Ail","Poireau","Brocoli","Chou-fleur","Chou blanc","Chou rouge","Laitue","Salade verte","Roquette","Mâche","Endive","Épinard","Haricots verts","Petits pois","Maïs","Champignons de Paris","Champignons shiitake","Girolles","Radis","Betterave","Navet","Céleri branche","Fenouil","Asperge verte","Patate douce","Artichaut","Potiron","Butternut","Persil","Basilic","Coriandre","Menthe","Thym","Romarin","Ciboulette","Gingembre","Piment","Poulet entier","Blanc de poulet","Cuisses de poulet","Pilons de poulet","Ailes de poulet","Boeuf haché","Steak haché","Steak","Entrecôte","Faux-filet","Filet de boeuf","Rôti de boeuf","Veau haché","Escalope de veau","Côte de porc","Filet mignon de porc","Rôti de porc","Travers de porc","Agneau haché","Gigot d'agneau","Épaule d'agneau","Dinde entière","Escalope de dinde","Magret de canard","Confit de canard","Lapin","Jambon blanc","Jambon cru","Jambon de Bayonne","Chorizo","Lardons","Bacon","Saucisses de Strasbourg","Merguez","Chipolatas","Boudin noir","Pâté","Rillettes","Foie gras","Saumon frais","Saumon fumé","Thon frais","Thon en boîte","Cabillaud","Truite","Sardines fraîches","Sardines en boîte","Maquereau","Lieu noir","Colin","Merlu","Dorade","Bar","Anchois","Crevettes roses","Crevettes grises","Gambas","Moules","Huîtres","Saint-Jacques","Calamars","Homard","Langoustines","Crabe","Surimi","Oeufs","Oeufs bio","Oeufs fermiers","Lait demi-écrémé","Lait entier","Lait écrémé","Lait sans lactose","Yaourt nature","Yaourt aux fruits","Yaourt grec","Skyr","Fromage blanc","Beurre doux","Beurre demi-sel","Margarine","Crème fraîche épaisse","Crème fraîche liquide","Crème liquide","Emmental","Gruyère","Comté","Beaufort","Camembert","Brie","Roquefort","Mozzarella","Burrata","Parmesan","Reblochon","Munster","Cheddar","Gouda","Ricotta","Feta","Mascarpone","Saint-Môret","Kiri","Babybel","Baguette","Pain complet","Pain aux céréales","Pain de mie","Pain de seigle","Brioche","Croissants","Pains au chocolat","Madeleines","Cookies","Sablés","Biscottes","Crackers","Pâte brisée","Pâte feuilletée","Pâte à pizza","Pâtes spaghetti","Pâtes penne","Pâtes fusilli","Pâtes farfalle","Lasagnes","Gnocchi","Riz basmati","Riz long grain","Riz rond","Riz complet","Boulgour","Semoule","Quinoa","Millet","Lentilles vertes","Lentilles corail","Pois chiches","Haricots rouges","Haricots blancs","Sauce tomate","Coulis de tomate","Concentré de tomate","Sauce bolognaise","Pesto","Sauce béchamel","Huile d'olive","Huile de tournesol","Huile de colza","Vinaigre de vin","Vinaigre balsamique","Moutarde de Dijon","Ketchup","Mayonnaise","Sauce soja","Tabasco","Sel fin","Sel de mer","Poivre noir","Paprika","Cumin","Curcuma","Curry","Cannelle","Herbes de Provence","Sucre blanc","Sucre roux","Miel","Sirop d'érable","Confiture fraise","Confiture abricot","Confiture cerise","Nutella","Farine de blé","Farine complète","Maïzena","Levure chimique","Chocolat noir","Chocolat au lait","Chocolat pâtissier","Cacao en poudre","Café moulu","Café en grains","Café soluble","Capsules café","Thé noir","Thé vert","Tisane","Verveine","Camomille","Chips nature","Chips paprika","Noix","Amandes","Noisettes","Noix de cajou","Pistaches","Cacahuètes","Graines de sésame","Graines de chia","Céréales petit déjeuner","Muesli","Flocons d'avoine","Granola","Compote pomme","Compote poire","Bouillon de légumes","Bouillon de poulet","Conserve de thon","Conserve de sardines","Tomates pelées","Soupe en brique","Eau plate 1,5L","Eau gazeuse","Jus d'orange","Jus de pomme","Jus multifruits","Coca-Cola","Coca-Cola Zero","Pepsi","Sprite","Fanta","Limonade","Orangina","Perrier","Bière blonde","Bière brune","Bière sans alcool","Vin rouge","Vin blanc","Vin rosé","Champagne","Cidre","Pastis","Lait d'amande","Lait de soja","Lait d'avoine","Smoothie","Pizza surgelée","Frites surgelées","Nuggets de poulet","Légumes surgelés","Glace vanille","Glace chocolat","Sorbet citron","Sorbet framboise","Shampoing","Après-shampoing","Gel douche","Savon liquide","Savon solide","Dentifrice","Brosse à dents","Déodorant","Rasoir","Mousse à raser","Coton","Coton-tiges","Serviettes hygiéniques","Tampons","Couches","Lingettes","Mouchoirs","Crème solaire","Lessive liquide","Lessive capsules","Assouplissant","Liquide vaisselle","Pastilles lave-vaisselle","Nettoyant WC","Javel","Essuie-tout","Papier toilette","Sacs poubelle","Film alimentaire","Papier aluminium","Éponge","Lait maternisé","Petit pot légumes","Petit pot viande","Petit pot fruits","Compote bébé","Couches taille 1","Couches taille 2","Couches taille 3","Couches taille 4","Couches taille 5","Tétine","Biberon","Croquettes chien","Croquettes chat","Pâtée chien","Pâtée chat","Litière chat","Friandises chien","Friandises chat"]

function getSuggestions(q) {
  if (!q || q.length < 2) return []
  const qn = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const exact = [], starts = []
  for (const p of PRODS) {
    const pn = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (pn === qn) exact.push(p)
    else if (pn.startsWith(qn)) starts.push(p)
  }
  return [...exact, ...starts].slice(0, 5)
}

function showSuggestions(q) {
  if (!q || q.length < 2) { document.getElementById('suggest').innerHTML = ''; return }
  const list = getSuggestions(q)
  const customItem = `<div class="sug-item sug-custom" data-name="${esc(q)}" style="border-top: 1px solid var(--border)">
    <span class="sug-icon">✏️</span>
    <span class="sug-name">Ajouter "<strong>${esc(q)}</strong>"</span>
  </div>`

  document.getElementById('suggest').innerHTML =
    '<div class="suggest-list">' +
    list.map(s => {
      const c = detectCat(s)
      return `<div class="sug-item" data-name="${esc(s)}">
        <span class="sug-icon">${c.icon}</span>
        <span class="sug-name">${esc(s)}</span>
        <span class="sug-cat">${c.label}</span>
      </div>`
    }).join('') +
    customItem +
    '</div>'

  document.querySelectorAll('.sug-item').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name
      document.getElementById('new-item').value = name
      document.getElementById('suggest').innerHTML = ''
      const pi = document.getElementById('price-input')
      const p = defPrice(name)
      pi.value = p ? p.toFixed(2) : ''
      if (el.classList.contains('sug-custom')) {
        addItem()
      } else {
        pi.focus()
      }
    })
  })
}

// ════════════════════════════════
// RENDER COURSES
// ════════════════════════════════
function renderCourses() {
  const pending = items.filter(i => !i.checked)
  const done = items.filter(i => i.checked)
  const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)

  if (!items.length) {
    document.getElementById('courses-content').innerHTML =
      '<div class="empty"><span class="empty-icon">🛒</span><h3>Liste vide</h3><p>Ajoute ton premier article.</p></div>'
    return
  }

  let html = ''
  const groups = {}
  for (const item of pending) {
    const cat = detectCat(item.name, item.category)
    if (!groups[cat.id]) groups[cat.id] = { cat, items: [] }
    groups[cat.id].items.push(item)
  }
  const order = [...CATS.map(c => c.id), 'au']
  for (const id of order) {
    if (!groups[id]) continue
    const g = groups[id]
    const ct = g.items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)
    const pct = total > 0 && ct > 0 ? Math.round(ct / total * 100) : 0
    html += `<div class="cat-head">
      <span class="cat-ico">${g.cat.icon}</span>
      <span class="cat-nm">${g.cat.label}</span>
      <span class="cat-cnt">${g.items.length}</span>
      ${ct > 0 ? `<span class="cat-price">${fmt(ct)}</span>` : ''}
      ${pct > 0 ? `<span class="cat-pct">${pct}%</span>` : ''}
    </div>
    <div class="items-wrap"><div class="items-list">${g.items.map(renderItem).join('')}</div></div>`
  }

  if (done.length) {
    const dt = done.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)
    const dp = total > 0 && dt > 0 ? Math.round(dt / total * 100) : 0
    html += `<div class="cat-head">
      <span class="cat-ico">✅</span>
      <span class="cat-nm">Cochés</span>
      <span class="cat-cnt">${done.length}</span>
      ${dt > 0 ? `<span class="cat-price">${fmt(dt)}</span>` : ''}
      ${dp > 0 ? `<span class="cat-pct">${dp}%</span>` : ''}
    </div>
    <div class="items-wrap"><div class="items-list">${done.map(renderItem).join('')}</div></div>
    <div class="btns-wrap">
      <button class="btn-blue" id="btn-reset" style="flex:1">Rafraîchir la liste</button>
    </div>`
  }

  if (total > 0) {
    html += `<div class="total-bar">
      <span class="total-label">Total estimé</span>
      <span class="total-amount">${fmt(total)}</span>
    </div>`
  }

  document.getElementById('courses-content').innerHTML = html

  // Wire dynamic buttons via event delegation on courses-content
  const cc = document.getElementById('courses-content')
  cc.addEventListener('click', e => {
    const btnReset = e.target.closest('#btn-reset')
    const del = e.target.closest('.del')
    const qtyMinus = e.target.closest('.qty-minus')
    const qtyPlus = e.target.closest('.qty-plus')
    const priceEl = e.target.closest('.editable-price')
    const item = e.target.closest('.item')
    if (btnReset) { resetChecked(); return }
    if (del) { e.stopPropagation(); e.preventDefault(); deleteItem(del.dataset.id); return }
    if (qtyMinus) { e.stopPropagation(); updateQty(qtyMinus.dataset.id, -1); return }
    if (qtyPlus) { e.stopPropagation(); updateQty(qtyPlus.dataset.id, 1); return }
    const addPriceEl = e.target.closest('.add-price')
    if (addPriceEl) { e.stopPropagation(); editPrice(addPriceEl); return }
    if (priceEl) { e.stopPropagation(); editPrice(priceEl); return }
    if (item && !e.target.closest('.qty-ctrl') && !e.target.closest('.editable-price') && !e.target.closest('.add-price')) { toggleItem(item.dataset.id, item.dataset.checked === 'true') }
  })
}

function renderItem(item) {
  const qty = item.quantity || 1
  const totalPrice = item.price ? item.price * qty : null
  const priceDisplay = totalPrice
    ? `<span class="item-price editable-price" data-id="${item.id}" data-price="${item.price || ''}">${fmt(totalPrice)}</span>`
    : `<span class="item-price no-price add-price" data-id="${item.id}">+prix</span>`
  return `<div class="item${item.checked ? ' done' : ''}" data-id="${item.id}" data-checked="${item.checked}">
    <div class="cb"><svg viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,11 12,3" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <span class="item-nm">${esc(item.name)}</span>
    <div class="qty-ctrl" data-id="${item.id}">
      <button class="qty-btn qty-minus" data-id="${item.id}">−</button>
      <span class="qty-val">${qty}</span>
      <button class="qty-btn qty-plus" data-id="${item.id}">+</button>
    </div>
    ${priceDisplay}
    <button class="del" data-id="${item.id}">
      <svg viewBox="0 0 16 16" fill="none" style="pointer-events:none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
  </div>`
}

// ════════════════════════════════
// TABS
// ════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('pane-' + name).classList.add('active')
  document.getElementById('nav-' + name).classList.add('active')
  if (name === 'accueil') loadMembers()
  if (name === 'calendrier') loadCalEvents()
}

// ════════════════════════════════

// ════════════════════════════════
// CALENDRIER
// ════════════════════════════════
let calYear = new Date().getFullYear()
let calMonth = new Date().getMonth()
let calSelected = null
let calColor = '#007AFF'
let calEvents = []

async function loadCalEvents() {
  if (!FC) return
  const { data } = await sb.from('pf_cal_events').select('*').eq('family_code', FC).order('date', { ascending: true })
  calEvents = data || []
  renderCal()
}

async function saveCalEvent() {
  const title = document.getElementById('ev-title').value.trim()
  const date = document.getElementById('ev-date').value
  const time = document.getElementById('ev-time').value
  const who = document.getElementById('ev-who').value.trim() || 'Toute la famille'
  if (!title || !date) { toast('Remplis le titre et la date'); return }
  await sb.from('pf_cal_events').insert([{ title, date, time, who, color: calColor, family_code: FC }])
  closeCalModal()
  await loadCalEvents()
}

async function deleteCalEvent(id) {
  if (!confirm('Supprimer cet événement ?')) return
  await sb.from('pf_cal_events').delete().eq('id', id)
  await loadCalEvents()
}

function openCalModal(date) {
  document.getElementById('ev-title').value = ''
  document.getElementById('ev-date').value = date || ''
  document.getElementById('ev-time').value = ''
  // Populate who select with members
  const sel = document.getElementById('ev-who')
  sel.innerHTML = '<option value="Toute la famille">Toute la famille</option>'
  members.forEach(m => {
    const opt = document.createElement('option')
    opt.value = m.prenom
    opt.textContent = m.prenom
    sel.appendChild(opt)
  })
  sel.value = 'Toute la famille'
  setCalColor('#007AFF')
  document.getElementById('cal-modal').style.display = 'flex'
}

function closeCalModal() {
  document.getElementById('cal-modal').style.display = 'none'
}

function setCalColor(c) {
  calColor = c
  document.querySelectorAll('.color-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === c)
  })
}

function renderCal() {
  const monthNames = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre']
  const label = document.getElementById('cal-month-label')
  if (label) label.textContent = monthNames[calMonth] + ' ' + calYear
  const grid = document.getElementById('cal-grid')
  if (!grid) return
  grid.innerHTML = ''
  const today = new Date()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const prevDays = new Date(calYear, calMonth, 0).getDate()
  for (let i = offset - 1; i >= 0; i--) {
    grid.innerHTML += '<div class="cal-day other-month"><div class="cal-day-num">' + (prevDays - i) + '</div></div>'
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0')
    const evs = calEvents.filter(e => e.date === dateStr)
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
    const isSel = calSelected === dateStr
    const dots = evs.slice(0,3).map(e => '<div class="cal-dot" style="background:' + (isSel ? 'rgba(255,255,255,0.8)' : e.color) + '"></div>').join('')
    grid.innerHTML += '<div class="cal-day' + (isToday ? ' today' : '') + (isSel ? ' selected' : '') + '" data-date="' + dateStr + '"><div class="cal-day-num">' + d + '</div><div class="cal-dots">' + dots + '</div></div>'
  }
  grid.querySelectorAll('.cal-day[data-date]').forEach(el => {
    el.addEventListener('click', () => {
      calSelected = calSelected === el.dataset.date ? null : el.dataset.date
      const t = document.getElementById('cal-events-title')
      if (t) t.textContent = calSelected ? new Date(calSelected + 'T12:00:00').toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long'}) : 'Evenements a venir'
      renderCal()
    })
  })
  renderCalEvents()
}

function renderCalEvents() {
  const list = document.getElementById('cal-events-list')
  if (!list) return
  const todayStr = new Date().toISOString().split('T')[0]
  const filtered = calSelected ? calEvents.filter(e => e.date === calSelected) : calEvents.filter(e => e.date >= todayStr).slice(0,6)
  if (!filtered.length) { list.innerHTML = '<div class="cal-empty">Aucun evenement</div>'; return }
  list.innerHTML = filtered.map(e => {
    const d = new Date(e.date + 'T12:00:00')
    const lbl = calSelected ? '' : d.toLocaleDateString('fr-FR', {weekday:'short',day:'numeric',month:'short'}) + ' · '
    return '<div class="cal-event-row"><div class="cal-event-stripe" style="background:' + e.color + '"></div><div class="cal-event-info"><div class="cal-event-title">' + esc(e.title) + '</div><div class="cal-event-meta">' + lbl + (e.time ? e.time + ' · ' : '') + esc(e.who) + '</div></div><button class="cal-event-del" data-id="' + e.id + '">&times;</button></div>'
  }).join('')
  list.querySelectorAll('.cal-event-del').forEach(btn => {
    btn.addEventListener('click', () => deleteCalEvent(btn.dataset.id))
  })
}

function initCalendar() {
  const prev = document.getElementById('cal-prev')
  const next = document.getElementById('cal-next')
  if (prev) prev.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear-- } calSelected = null; renderCal() })
  if (next) next.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++ } calSelected = null; renderCal() })
  const addBtn = document.getElementById('cal-add-btn')
  if (addBtn) addBtn.addEventListener('click', () => openCalModal(calSelected || ''))
  const saveBtn = document.getElementById('ev-save-btn')
  if (saveBtn) saveBtn.addEventListener('click', saveCalEvent)
  const cancelBtn = document.getElementById('ev-cancel-btn')
  if (cancelBtn) cancelBtn.addEventListener('click', closeCalModal)
  const modal = document.getElementById('cal-modal')
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeCalModal() })
  document.querySelectorAll('.color-opt').forEach(el => el.addEventListener('click', () => setCalColor(el.dataset.color)))
  setCalColor('#007AFF')
  renderCal()
}


// ════════════════════════════════
// DEVOIRS
// ════════════════════════════════
const GEMINI_KEY = 'AIzaSyBkko2MmIT4DwnEzlbYnKrWU_1cnXrRRA8'

const CHAPITRES = {
  "CP":  ["Numeration jusqu a 30","Additions simples","Soustractions simples","Formes geometriques","Mesures de longueur"],
  "CE1": ["Numeration jusqu a 100","Tables d addition","Introduction multiplication","Mesures","Geometrie plane"],
  "CE2": ["Tables de multiplication","Divisions simples","Fractions simples","Perimetre","Problemes"],
  "CM1": ["Fractions","Nombres decimaux","Aire et perimetre","Angles","Proportionnalite"],
  "CM2": ["Multiplications de decimaux","Fractions avancees","Volume","Statistiques","Pourcentages"],
  "6eme":["Fractions","Nombres relatifs","Statistiques","Geometrie dans l espace","Proportionnalite"],
  "5eme":["Calcul litteral","Probabilites","Theoreme de Pythagore","Fractions et decimaux","Symetrie"],
  "4eme":["Equations","Puissances","Trigonometrie","Statistiques","Geometrie"],
  "3eme":["Fonctions","Theoreme de Thales","Statistiques avancees","Equations du second degre","Geometrie dans l espace"],
}

let devClasse = '', devChapitre = '', devExercicesData = []

function initDevoirs() {
  // Étape 1 : classe
  document.querySelectorAll('.dev-card[data-classe]').forEach(btn => {
    btn.addEventListener('click', () => {
      devClasse = btn.dataset.classe
      showDevStep('chapitre')
    })
  })

  // Étape 2 : chapitre
  document.getElementById('dev-back-classe')?.addEventListener('click', () => showDevStep('classe'))
  document.getElementById('dev-chapitre-custom-btn')?.addEventListener('click', () => {
    const val = document.getElementById('dev-chapitre-custom').value.trim()
    if (!val) return
    devChapitre = val
    showDevStep('contenu')
    genLecon()
  })
  document.getElementById('dev-chapitre-custom')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('dev-chapitre-custom-btn').click()
  })

  // Étape 3 : contenu
  document.getElementById('dev-back-chapitre')?.addEventListener('click', () => showDevStep('chapitre'))
  document.getElementById('dev-btn-exercices')?.addEventListener('click', () => {
    showDevTab('exercices')
    if (!devExercicesData.length) genExercices()
  })
  document.getElementById('dev-btn-corriger')?.addEventListener('click', corrigerExercices)
  document.getElementById('dev-btn-retry')?.addEventListener('click', () => {
    devExercicesData = []
    document.getElementById('dev-score').style.display = 'none'
    document.getElementById('dev-btn-corriger').style.display = 'none'
    document.getElementById('dev-exercices-content').innerHTML = '<div class="loading"><div class="spinner"></div>Génération des exercices…</div>'
    genExercices()
  })

  // Tabs
  document.getElementById('dev-tab-lecon')?.addEventListener('click', () => showDevTab('lecon'))
  document.getElementById('dev-tab-exercices')?.addEventListener('click', () => {
    showDevTab('exercices')
    if (!devExercicesData.length) genExercices()
  })
}

function showDevStep(step) {
  document.getElementById('dev-step-classe').style.display = step === 'classe' ? 'block' : 'none'
  document.getElementById('dev-step-chapitre').style.display = step === 'chapitre' ? 'block' : 'none'
  document.getElementById('dev-step-contenu').style.display = step === 'contenu' ? 'block' : 'none'

  if (step === 'chapitre') {
    document.getElementById('dev-chapitre-title').textContent = 'Chapitres — ' + devClasse
    document.getElementById('dev-chapitre-custom').value = ''
    const list = document.getElementById('dev-chapitres-list')
    const chaps = CHAPITRES[devClasse.replace('è','e').replace('é','e')] || []
    list.innerHTML = chaps.map(c => `<button class="dev-card" data-chap="${esc(c)}">${esc(c)}</button>`).join('')
    list.querySelectorAll('.dev-card[data-chap]').forEach(btn => {
      btn.addEventListener('click', () => {
        devChapitre = btn.dataset.chap
        showDevStep('contenu')
        genLecon()
      })
    })
  }

  if (step === 'contenu') {
    document.getElementById('dev-contenu-title').textContent = devChapitre
    document.getElementById('dev-contenu-sub').textContent = 'Maths · ' + devClasse
    showDevTab('lecon')
    devExercicesData = []
    document.getElementById('dev-score').style.display = 'none'
    document.getElementById('dev-btn-corriger').style.display = 'none'
  }
}

function showDevTab(tab) {
  const leconPanel = document.getElementById('dev-lecon-panel')
  const exPanel = document.getElementById('dev-exercices-panel')
  const tabLecon = document.getElementById('dev-tab-lecon')
  const tabEx = document.getElementById('dev-tab-exercices')
  if (tab === 'lecon') {
    leconPanel.style.display = 'block'
    exPanel.style.display = 'none'
    tabLecon.classList.add('active')
    tabEx.classList.remove('active')
    tabLecon.style.background = 'var(--surface)'
    tabLecon.style.color = 'var(--text)'
    tabEx.style.background = 'transparent'
    tabEx.style.color = 'var(--muted)'
  } else {
    leconPanel.style.display = 'none'
    exPanel.style.display = 'block'
    tabEx.classList.add('active')
    tabLecon.classList.remove('active')
    tabEx.style.background = 'var(--surface)'
    tabEx.style.color = 'var(--text)'
    tabLecon.style.background = 'transparent'
    tabLecon.style.color = 'var(--muted)'
  }
}

async function callGemini(prompt) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=' + GEMINI_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  })
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function genLecon() {
  const el = document.getElementById('dev-lecon-content')
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Génération de la leçon…</div>'
  const prompt = "Tu es un professeur des ecoles francais. Genere une lecon claire et simple sur le chapitre \"" + devChapitre + "\" pour un eleve de " + devClasse + ". La lecon doit contenir : un titre, la definition ou regle principale en gras, 2-3 exemples concrets avec des calculs, un encadre A retenir a la fin. Format HTML simple avec h3, p, strong, ul, li. Pas de CSS inline. Adapte le niveau a " + devClasse + ".";
  const _prompt = prompt

  try {
    const lecon = await callGemini(_prompt)
    el.innerHTML = lecon
  } catch(e) {
    el.innerHTML = '<p style="color:var(--red)">Erreur de génération. Vérifie ta connexion.</p>'
  }
}

async function genExercices() {
  const el = document.getElementById('dev-exercices-content')
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Génération des exercices…</div>'
  document.getElementById('dev-btn-corriger').style.display = 'none'
  document.getElementById('dev-score').style.display = 'none'

  const _prompt2 = "Genere 5 exercices de maths sur " + devChapitre + " pour un eleve de " + devClasse + ". Reponds en JSON uniquement, tableau de 5 objets avec les proprietes question et reponse. Reponse courte.";


  try {
    const raw = await callGemini(_prompt2)
    const clean = raw.replace(/\`\`\`json/g,'').replace(/\`\`\`/g,'').trim()
    devExercicesData = JSON.parse(clean)
    renderExercices()
  } catch(e) {
    el.innerHTML = '<p style="color:var(--red)">Erreur de génération. Réessaie.</p>'
  }
}

function renderExercices() {
  const el = document.getElementById('dev-exercices-content')
  el.innerHTML = devExercicesData.map((ex, i) => `
    <div style="background:var(--surface);border-radius:14px;padding:16px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.07)">
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:10px">${i+1}. ${esc(ex.question)}</div>
      <input type="text" class="dev-answer" data-index="${i}" placeholder="Ta réponse…" autocorrect="off"
        style="width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:10px 12px;font-family:inherit;font-size:14px;color:var(--text);outline:none;box-sizing:border-box"/>
    </div>`).join('')
  document.getElementById('dev-btn-corriger').style.display = 'block'
}

function corrigerExercices() {
  let score = 0
  document.querySelectorAll('.dev-answer').forEach((input, i) => {
    const ex = devExercicesData[i]
    const userAnswer = input.value.trim().toLowerCase().replace(/\s/g,'')
    const correctAnswer = String(ex.reponse).toLowerCase().replace(/\s/g,'')
    const correct = userAnswer === correctAnswer
    if (correct) score++
    input.style.border = correct ? '2px solid var(--green)' : '2px solid var(--red)'
    input.value = correct ? input.value : input.value + ' (Réponse : ' + ex.reponse + ')'
    input.disabled = true
  })
  document.getElementById('dev-btn-corriger').style.display = 'none'
  document.getElementById('dev-score').style.display = 'block'
  document.getElementById('dev-score-val').textContent = score + ' / ' + devExercicesData.length
}

window.startGenLecon = () => startGenLecon()
window.genExercices = () => genExercices()

// BOOT
// ════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Onboarding buttons
  document.getElementById('btn-create').addEventListener('click', doCreate)
  document.getElementById('btn-join').addEventListener('click', doJoin)
  document.getElementById('btn-show-join').addEventListener('click', showJoin)
  document.getElementById('btn-show-create').addEventListener('click', showCreate)
  document.getElementById('btn-copy').addEventListener('click', copyCode)
  document.getElementById('btn-logout').addEventListener('click', logout)
  document.getElementById('btn-share').addEventListener('click', shareInvite)
  document.getElementById('btn-add').addEventListener('click', addItem)

  // Nav buttons
  document.getElementById('nav-accueil').addEventListener('click', () => switchTab('accueil'))
  document.getElementById('nav-courses').addEventListener('click', () => switchTab('courses'))
  document.getElementById('nav-calendrier').addEventListener('click', () => switchTab('calendrier'))
  document.getElementById('nav-devoirs').addEventListener('click', () => switchTab('devoirs'))

  // Input
  const ni = document.getElementById('new-item')
  ni.addEventListener('keydown', e => { if (e.key === 'Enter') addItem() })
  ni.addEventListener('input', e => showSuggestions(e.target.value))
  ni.addEventListener('blur', () => setTimeout(() => { document.getElementById('suggest').innerHTML = '' }, 200))

  // Init calendar
  initCalendar()
  // Init devoirs
  initDevoirs()

  // Check localStorage
  const code = localStorage.getItem('pf_code')
  const fn   = localStorage.getItem('pf_family')
  const pr   = localStorage.getItem('pf_prenom')

  if (code && fn && pr) {
    startApp(code, fn, pr)
  } else {
    document.getElementById('onboarding').classList.add('visible')
  }
})
