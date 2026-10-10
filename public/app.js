const $ = selector => document.querySelector(selector);
const main = $('#main-content');
const state = {user:null,shops:[],view:'discover',shop:null,menu:[],cart:[],filter:'All spots',search:'',menuSearch:'',veg:false,authMode:'login',afterAuth:null,orders:[],staffTab:'orders',requestKey:null,pendingItem:null,checkoutBusy:false};
const money = value => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(value/100);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={placed:'Placed',accepted:'Accepted',preparing:'Preparing',out_for_delivery:'Out for delivery',delivered:'Delivered',cancelled:'Cancelled'};
const steps=['placed','accepted','preparing','out_for_delivery','delivered'];
let toastTimer, refreshBusy=false, viewRequest=0;
async function api(url,options={}) {
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json','X-Campus-Request':'1',...options.headers}});
  const data=await response.json();
  if(!response.ok) {const error=new Error(data.error||'Please try again.');error.status=response.status;throw error;}
  return data;
}
function toast(message) {$('#toast').textContent=message;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),4000);}
function showDialog(id) {const dialog=document.getElementById(id);if(!dialog.open)dialog.showModal();}
function updateAccount() {
  $('#account-button').textContent=state.user?state.user.name.split(' ')[0]:'Sign in ↗';
  $('#logout-button').classList.toggle('hidden',!state.user);
  document.querySelectorAll('.staff-only').forEach(el=>el.classList.toggle('hidden',state.user?.role!=='staff'));
  document.querySelector('[data-view="orders"]').classList.toggle('hidden',state.user?.role==='staff');
}
function saveCart() {
  state.requestKey=null;
  try{localStorage.setItem('campuseats_cart',JSON.stringify(state.cart));}catch{}
  $('#cart-count').textContent=state.cart.reduce((sum,item)=>sum+item.quantity,0);
  if($('#cart-dialog').open)renderCart();
}
function subtotal(){return state.cart.reduce((sum,i)=>sum+i.price_paise*i.quantity,0);}
function bill(){return `<div class="bill"><div><span>Food subtotal</span><span>${money(subtotal())}</span></div><div><span>Campus delivery</span><span>${money(1500)}</span></div><div><span>Total to pay</span><span>${money(subtotal()+1500)}</span></div></div>`;}
function quantityControls(item){return `<div class="quantity-controls" aria-label="Quantity for ${esc(item.name)}"><button data-quantity="${item.id}" data-delta="-1" aria-label="Remove one ${esc(item.name)}">−</button><span>${item.quantity}</span><button data-quantity="${item.id}" data-delta="1" aria-label="Add one ${esc(item.name)}" ${item.quantity>=20?'disabled':''}>+</button></div>`;}
function addItem(item){
  if(state.user?.role==='staff'){toast('Sign in as a student to place an order.');return;}
  if(state.cart.length && state.cart[0].shop_id!==item.shop_id){state.pendingItem=item;showDialog('switch-dialog');return;}
  const existing=state.cart.find(i=>i.id===item.id);
  if(existing){if(existing.quantity>=20){toast('Maximum 20 of each item per order.');return;}existing.quantity++;}
  else state.cart.push({...item,quantity:1,shop_name:state.shop.name});
  saveCart();if(state.view==='menu')renderMenuItems();toast('Added to your bag');
}
function changeQuantity(id,delta){
  const item=state.cart.find(i=>i.id===id);if(!item)return;
  item.quantity=Math.min(20,item.quantity+delta);
  state.cart=state.cart.filter(i=>i.quantity>0);saveCart();
  if(state.view==='menu')renderMenuItems();
}
function renderCart(){
  const content=$('#cart-content');
  if(!state.cart.length){content.innerHTML=`<div class="empty-state"><span>🛍️</span><h3>A little empty in here.</h3><p>Your next campus favourite is waiting.</p><button class="primary-button" data-close="cart-dialog">Find something tasty →</button></div>`;return;}
  content.innerHTML=`<p class="cart-shop-label">From <strong>${esc(state.cart[0].shop_name)}</strong> · One shop, one delivery</p>${state.cart.map(i=>`<div class="cart-row"><span class="cart-emoji" aria-hidden="true">${esc(i.emoji)}</span><div class="cart-row-info"><strong>${esc(i.name)}</strong><small>${money(i.price_paise*i.quantity)}</small></div>${quantityControls(i)}</div>`).join('')}${bill()}<button class="primary-button full" id="checkout-button">Continue to checkout →</button><p class="bottom-note">Cash on delivery · Delivered inside campus</p>`;
}
function auth(mode='login',after=null){state.authMode=mode;state.afterAuth=after;renderAuthMode();showDialog('auth-dialog');}
function renderAuthMode(){
  const register=state.authMode==='register';
  $('#auth-title').textContent=register?'Your seat at the table.':'Welcome to the table.';
  $('#auth-subtitle').textContent=register?'Create a student account. Your next meal awaits.':'Sign in to order from your campus favourites.';
  $('#name-label').classList.toggle('hidden',!register);$('#auth-name').required=register;
  $('#auth-password').minLength=register?8:1;$('#auth-password').autocomplete=register?'new-password':'current-password';
  $('#auth-submit').textContent=register?'Create account →':'Sign in →';$('#auth-switch-copy').textContent=register?'Already have an account?':'New here?';$('#toggle-auth').textContent=register?'Sign in':'Create an account';$('#auth-error').textContent='';
}
function beginCheckout(){
  if(!state.cart.length)return;
  $('#cart-dialog').close();
  if(!state.user){auth('login',beginCheckout);return;}
  if(state.user.role!=='student'){toast('Use a student account to order.');return;}
  $('#recipient').value=state.user.name;$('#checkout-summary').innerHTML=bill();$('#checkout-error').textContent='';
  showDialog('checkout-dialog');
}
function renderDiscover(){
  main.innerHTML=`<section class="hero"><div class="hero-copy"><span class="eyebrow">YOUR CAMPUS. YOUR CRAVINGS.</span><h1>Good food.<br>One less <em>queue.</em></h1><p>Your favourite campus canteens, delivered.<br>More time for the things you love.</p><button class="primary-button" id="explore-button">Find your next bite &nbsp; ↗</button></div><div class="hero-art" aria-hidden="true"><div class="art-ring outer"></div><div class="art-ring"></div><div class="food-plate"><span>🍔</span></div><span class="floating-food fries">🍟</span><span class="floating-food drink">🥤</span><div class="art-label">A break worth taking.<small>Fresh from your campus kitchen</small></div></div></section><div class="feature-strip"><span><b>⌖</b> Only on your campus</span><span><b>◷</b> Freshly made, close by</span><span><b>♡</b> Your everyday favourites</span></div><section id="spots"><div class="section-heading"><div><h2>Around your campus<span class="orange">.</span></h2><p id="shop-count">${state.shops.length} local spots. A whole lot of good food.</p></div><div class="search-field"><span>⌕</span><input id="shop-search" type="search" aria-label="Search shops" placeholder="Find a canteen or cuisine…" value="${esc(state.search)}"></div></div><div class="filters" aria-label="Shop categories">${['All spots','Burgers & bites','Pizza & pasta','Street food','Noodles & bowls','Coffee & sandwiches','Wraps & chicken'].map(f=>`<button class="filter ${state.filter===f?'active':''}" data-filter="${esc(f)}" aria-pressed="${state.filter===f}">${esc(f)}</button>`).join('')}</div><div class="shop-grid" id="shop-grid"></div><p class="bottom-note">A full campus day deserves a good meal.</p></section>`;
  renderShops();
}
function renderShops(){
  const list=state.shops.filter(s=>(state.filter==='All spots'||s.category===state.filter)&&`${s.name} ${s.category} ${s.location}`.toLowerCase().includes(state.search.toLowerCase()));
  $('#shop-grid').innerHTML=list.length?list.map(s=>`<button class="shop-card" data-shop="${s.id}" aria-label="View ${esc(s.name)} menu"><div class="shop-art ${esc(s.color)}"><span class="shop-open ${s.is_open?'':'closed'}">${s.is_open?'Open now':'Closed'}</span><span class="food-emoji" aria-hidden="true">${esc(s.emoji)}</span></div><div class="shop-info"><div class="shop-title"><h3>${esc(s.name)}</h3><span class="shop-arrow">↗</span></div><p>${esc(s.category)}</p><div class="shop-meta"><span>◷ ${esc(s.eta)}</span><span>${esc(s.location)}</span></div></div></button>`).join(''):`<div class="empty-state"><span>⌕</span><h3>No spots found.</h3><p>Try another name or category.</p></div>`;
  $('#shop-count').textContent=`${list.length} local ${list.length===1?'spot':'spots'}. A whole lot of good food.`;
}
async function openMenu(id){
  state.view='menu';state.menuSearch='';state.veg=false;setNav();
  const version=++viewRequest;main.innerHTML='<div class="loading">Opening the menu…</div>';
  try{const data=await api(`/api/shops/${id}/menu`);if(version!==viewRequest)return;state.shop=data.shop;state.menu=data.items;renderMenu();}
  catch(error){if(version===viewRequest)renderError(error);}
}
function renderMenu(){
  const shop=state.shop;
  main.innerHTML=`<button class="back-button" data-view="discover">← All campus spots</button><section class="menu-banner ${esc(shop.color)}"><span class="big-emoji" aria-hidden="true">${esc(shop.emoji)}</span><div><span class="eyebrow">${esc(shop.location)} · ${shop.is_open?'OPEN NOW':'CURRENTLY CLOSED'}</span><h1>${esc(shop.name)}</h1><p>${esc(shop.description)} &nbsp; · &nbsp; ${esc(shop.eta)}</p></div></section><div class="menu-toolbar"><div class="search-field"><span>⌕</span><input type="search" id="menu-search" aria-label="Search food" placeholder="What's calling your name?" value="${esc(state.menuSearch)}"></div><label class="veg-toggle"><input type="checkbox" id="veg-toggle" ${state.veg?'checked':''}> Vegetarian only</label></div><div class="menu-grid" id="menu-grid"></div>`;
  renderMenuItems();
}
function renderMenuItems(){
  const items=state.menu.filter(i=>(!state.veg||i.vegetarian)&&`${i.name} ${i.description}`.toLowerCase().includes(state.menuSearch.toLowerCase()));
  $('#menu-grid').innerHTML=items.length?items.map(i=>{const cartItem=state.cart.find(c=>c.id===i.id);return `<article class="menu-card"><div class="menu-emoji" aria-hidden="true">${esc(i.emoji)}</div><div class="menu-info"><div class="diet-label ${i.vegetarian?'':'nonveg'}">${i.vegetarian?'▣ Vegetarian':'▣ Non-vegetarian'} · ${esc(i.category)}</div><h3>${esc(i.name)}</h3><p>${esc(i.description)}</p><div class="menu-item-bottom"><span class="price">${money(i.price_paise)}</span>${!i.available||!state.shop.is_open?'<button class="add-button" disabled>Unavailable</button>':cartItem?quantityControls(cartItem):`<button class="add-button" data-add="${i.id}">Add +</button>`}</div></div></article>`;}).join(''):`<div class="empty-state"><span>🍽️</span><h3>No matching bites.</h3><p>Try a different search or switch off the vegetarian filter.</p></div>`;
}
function renderError(error){main.innerHTML=`<div class="error-state"><h3>We couldn't load that.</h3><p>${esc(error.message)}</p><button class="secondary-button" data-view="discover">Back to campus spots</button></div>`;}
function setNav(){document.querySelectorAll('.sidebar [data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===(state.view==='menu'?'discover':state.view)));}
async function navigate(view){
  if(view==='staff' && state.user?.role!=='staff')return;
  state.view=view;setNav();const version=++viewRequest;
  if(view==='discover'){renderDiscover();return;}
  if(!state.user){main.innerHTML=`<div class="empty-state"><span>▤</span><h3>Your food story starts here.</h3><p>Sign in to view and track your campus orders.</p><button class="primary-button" id="orders-signin">Sign in →</button></div>`;return;}
  main.innerHTML='<div class="loading">Checking the kitchen…</div>';
  try{const data=await api('/api/orders');if(version!==viewRequest)return;state.orders=data.orders;view==='staff'?renderStaff():renderOrders();}
  catch(error){if(version===viewRequest)renderError(error);}
}
function orderCard(order,staff=false){
  const statusIndex=steps.indexOf(order.status);
  const created=new Date(order.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
  return `<article class="order-card"><div class="order-header"><div><h3>${esc(order.shop_name)}</h3><p>Order #CE${String(order.id).padStart(4,'0')} · ${esc(created)}</p></div><span class="status-chip ${order.status==='cancelled'?'cancelled':''}">${esc(labels[order.status])}</span></div><div class="order-items">${order.items.map(i=>`${i.quantity} × ${esc(i.name)}`).join(' &nbsp; · &nbsp; ')}</div>${order.status==='cancelled'?'<p class="muted">This order was cancelled. No payment is due.</p>':`<div class="tracking" aria-label="Order status: ${esc(labels[order.status])}">${steps.map((s,index)=>`<div class="tracking-step ${index<=statusIndex?'done':''}" title="${esc(order.events.find(e=>e.status===s)?.created_at||'Pending')}">${esc(labels[s])}</div>`).join('')}</div>`}<div class="order-footer"><span>⌖ ${esc(order.location)}, ${esc(order.room)}<br>Cash on delivery</span><strong>${money(order.total_paise)}</strong></div>${staff?`<div class="staff-details">${esc(order.recipient)} · ${esc(order.phone)}${order.instructions?`<br>Note: ${esc(order.instructions)}`:''}</div>${['cancelled','delivered'].includes(order.status)?'':`<div class="staff-actions"><button class="primary-button" data-status-order="${order.id}" data-status="${steps[statusIndex+1]}">${({placed:'Accept order',accepted:'Start preparing',preparing:'Send for delivery',out_for_delivery:'Mark delivered'})[order.status]} →</button><button class="secondary-button" data-status-order="${order.id}" data-status="cancelled">Cancel order</button></div>`}`:''}</article>`;
}
function renderOrders(){
  main.innerHTML=`<div class="section-heading page-title"><div><span class="eyebrow">FROM KITCHEN TO CAMPUS</span><h1>Your orders<span class="orange">.</span></h1><p>A little anticipation. A lot of good food.</p></div><button class="secondary-button" data-refresh>Refresh ↻</button></div><p class="muted">Status updates automatically every 10 seconds while this page is open.</p><div class="orders-list">${state.orders.length?state.orders.map(o=>orderCard(o)).join(''):`<div class="empty-state"><span>🍽️</span><h3>No orders. Plenty of possibilities.</h3><p>Pick a campus spot and find your first favourite.</p><button class="primary-button" data-view="discover">Explore canteens →</button></div>`}</div>`;
}
function renderStaff(){
  const active=state.orders.filter(o=>!['delivered','cancelled'].includes(o.status));
  const delivered=state.orders.filter(o=>o.status==='delivered');
  main.innerHTML=`<div class="section-heading page-title"><div><span class="eyebrow">BEHIND THE COUNTER</span><h1>The campus kitchen<span class="orange">.</span></h1><p>Manage orders and menu availability across your campus shops.</p></div><button class="secondary-button" data-refresh>Refresh ↻</button></div><div class="stat-grid"><div class="stat-card"><small>Active orders</small><strong>${active.length}</strong></div><div class="stat-card"><small>Delivered orders</small><strong>${delivered.length}</strong></div><div class="stat-card"><small>Delivered sales</small><strong>${money(delivered.reduce((s,o)=>s+o.subtotal_paise,0))}</strong></div></div><p class="muted">Latest 200 orders · Updates automatically every 10 seconds.</p><div class="filters"><button class="filter ${state.staffTab==='orders'?'active':''}" data-staff-tab="orders">Live order board</button><button class="filter ${state.staffTab==='menu'?'active':''}" data-staff-tab="menu">Menu availability</button></div><div id="staff-content">${state.staffTab==='orders'?`<div class="orders-list">${state.orders.length?[...active,...state.orders.filter(o=>['delivered','cancelled'].includes(o.status))].map(o=>orderCard(o,true)).join(''):'<div class="empty-state"><span>👨‍🍳</span><h3>The kitchen is ready.</h3><p>Student orders will appear here.</p></div>'}</div>`:`<div class="staff-shop-select"><label for="staff-shop">Choose shop</label><select id="staff-shop">${state.shops.map(s=>`<option value="${s.id}" ${state.shop?.id===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div><div id="staff-menu-list" class="loading">Loading menu…</div>`}</div>`;
  if(state.staffTab==='menu')loadStaffMenu(Number($('#staff-shop').value));
}
async function loadStaffMenu(id){
  try{const data=await api(`/api/shops/${id}/menu`);if(state.view!=='staff'||state.staffTab!=='menu'||Number($('#staff-shop')?.value)!==id)return;state.shop=data.shop;state.menu=data.items;
  $('#staff-menu-list').classList.remove('loading');$('#staff-menu-list').innerHTML=data.items.map(i=>`<div class="staff-menu-row"><div><strong>${esc(i.emoji)} ${esc(i.name)}</strong><small>${money(i.price_paise)} · ${i.available?'Available':'Sold out'}</small></div><button class="${i.available?'secondary':'primary'}-button" data-availability="${i.id}" data-value="${!i.available}">${i.available?'Mark sold out':'Make available'}</button></div>`).join('');}
  catch(error){toast(error.message);$('#staff-menu-list')?.classList.remove('loading');if($('#staff-menu-list'))$('#staff-menu-list').textContent=error.message;}
}
async function refreshOrders(silent=false){
  if(refreshBusy || !state.user || !['orders','staff'].includes(state.view) || (state.view==='staff'&&state.staffTab==='menu'))return;
  refreshBusy=true;const view=state.view;
  try{const data=await api('/api/orders');if(state.view!==view)return;const changed=JSON.stringify(data.orders)!==JSON.stringify(state.orders);state.orders=data.orders;if(changed||!silent){view==='staff'?renderStaff():renderOrders();if(!silent)toast('Orders are up to date');}}
  catch(error){if(!silent)toast(error.message);}finally{refreshBusy=false;}
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button || button.disabled)return;
  if(state.checkoutBusy)return;
  if(button.dataset.close){document.getElementById(button.dataset.close).close();return;}
  if(button.dataset.view){navigate(button.dataset.view);return;}
  if(button.dataset.shop){openMenu(Number(button.dataset.shop));return;}
  if(button.dataset.filter){state.filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===state.filter);b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter));});renderShops();return;}
  if(button.dataset.add){const item=state.menu.find(i=>i.id===Number(button.dataset.add));if(item)addItem(item);return;}
  if(button.dataset.quantity){changeQuantity(Number(button.dataset.quantity),Number(button.dataset.delta));return;}
  if(button.dataset.demo){state.authMode='login';renderAuthMode();$('#auth-email').value=button.dataset.demo==='student'?'student@campus.local':'staff@campus.local';$('#auth-password').value=button.dataset.demo==='student'?'student123':'staff1234';$('#auth-form').requestSubmit();return;}
  if(button.hasAttribute('data-refresh')){if(state.staffTab==='menu'&&state.view==='staff')await loadStaffMenu(Number($('#staff-shop').value));else await refreshOrders();return;}
  if(button.dataset.staffTab){state.staffTab=button.dataset.staffTab;renderStaff();return;}
  if(button.dataset.statusOrder){
    if(button.dataset.status==='cancelled'&&!confirm('Cancel this order? The student will see it as cancelled.'))return;
    button.disabled=true;
    try{await api(`/api/orders/${button.dataset.statusOrder}/status`,{method:'PATCH',body:JSON.stringify({status:button.dataset.status})});await refreshOrders();}catch(error){toast(error.message);button.disabled=false;}return;
  }
  if(button.dataset.availability){button.disabled=true;try{await api(`/api/menu-items/${button.dataset.availability}/availability`,{method:'PATCH',body:JSON.stringify({available:button.dataset.value==='true'})});await loadStaffMenu(state.shop.id);toast('Menu availability updated');}catch(error){toast(error.message);button.disabled=false;}return;}
  if(button.id==='open-cart'){renderCart();showDialog('cart-dialog');}
  if(button.id==='account-button')state.user?toast(`Signed in as ${state.user.email}`):auth();
  if(button.id==='orders-signin')auth('login',()=>navigate('orders'));
  if(button.id==='toggle-auth'){state.authMode=state.authMode==='login'?'register':'login';renderAuthMode();}
  if(button.id==='explore-button')$('#spots').scrollIntoView({behavior:'smooth'});
  if(button.id==='checkout-button')beginCheckout();
  if(button.id==='confirm-switch'){state.cart=[];const item=state.pendingItem;state.pendingItem=null;$('#switch-dialog').close();if(item)addItem(item);}
  if(button.id==='logout-button'){
    try{await api('/api/logout',{method:'POST',body:'{}'});state.user=null;state.cart=[];saveCart();updateAccount();navigate('discover');toast('Signed out');}catch(error){toast(error.message);}
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='shop-search'){state.search=event.target.value;renderShops();}
  if(event.target.id==='menu-search'){state.menuSearch=event.target.value;renderMenuItems();}
});
document.addEventListener('change',event=>{
  if(event.target.id==='veg-toggle'){state.veg=event.target.checked;renderMenuItems();}
  if(event.target.id==='staff-shop')loadStaffMenu(Number(event.target.value));
});
$('#auth-form').addEventListener('submit',async event=>{
  event.preventDefault();$('#auth-submit').disabled=true;$('#auth-error').textContent='';
  try{
    const data=await api(`/api/${state.authMode}`,{method:'POST',body:JSON.stringify({name:$('#auth-name').value,email:$('#auth-email').value,password:$('#auth-password').value})});
    state.user=data.user;updateAccount();$('#auth-dialog').close();$('#auth-password').value='';toast(`Welcome, ${state.user.name.split(' ')[0]}!`);
    const next=state.afterAuth;state.afterAuth=null;
    if(state.user.role==='staff')navigate('staff');else if(next)next();else if(state.view==='orders')navigate('orders');
  }catch(error){$('#auth-error').textContent=error.message;}finally{$('#auth-submit').disabled=false;}
});
$('#checkout-form').addEventListener('submit',async event=>{
  event.preventDefault();if(state.checkoutBusy)return;state.checkoutBusy=true;
  const button=$('#place-order');button.disabled=true;button.textContent='Placing your order…';$('#checkout-error').textContent='';
  state.requestKey ||= crypto.randomUUID();
  const form=Object.fromEntries(new FormData(event.target));
  const fields=[...event.target.querySelectorAll('input,select,textarea')];
  fields.forEach(field=>field.disabled=true);
  try{
    const data=await api('/api/orders',{method:'POST',body:JSON.stringify({...form,items:state.cart.map(i=>({id:i.id,quantity:i.quantity})),request_key:state.requestKey})});
    state.cart=[];saveCart();$('#header-location').textContent=`${data.order.location} · ${data.order.room}`;$('#checkout-dialog').close();event.target.reset();
    await navigate('orders');toast(`Order #CE${String(data.order.id).padStart(4,'0')} placed! Pay when it arrives.`);
  }catch(error){$('#checkout-error').textContent=error.message;if(error.status===401){$('#checkout-dialog').close();auth('login',beginCheckout);}}
  finally{state.checkoutBusy=false;fields.forEach(field=>field.disabled=false);button.disabled=false;button.textContent='Place order →';}
});
$('#checkout-dialog').addEventListener('cancel',event=>{if(state.checkoutBusy)event.preventDefault();});
async function init(){
  main.innerHTML='<div class="loading">Finding your campus favourites…</div>';
  try{
    const [session,shops]=await Promise.all([api('/api/session'),api('/api/shops')]);state.user=session.user;state.shops=shops.shops;
    // Restore only valid item IDs and quantities; prices always come from the connected database.
    try{
      const saved=JSON.parse(localStorage.getItem('campuseats_cart')||'[]');
      if(Array.isArray(saved)&&saved.length&&saved.length<=30){const shop=state.shops.find(s=>s.id===saved[0].shop_id);
        if(shop){const menu=await api(`/api/shops/${shop.id}/menu`);const ids=new Set();
          state.cart=saved.flatMap(old=>{const item=menu.items.find(i=>i.id===old.id&&i.available);if(!item||ids.has(item.id)||!Number.isInteger(old.quantity)||old.quantity<1||old.quantity>20)return[];ids.add(item.id);return[{...item,quantity:old.quantity,shop_name:shop.name}];});}
      }
    }catch{}
    $('#connection-status').textContent='Database connected';saveCart();updateAccount();await navigate(state.user?.role==='staff'?'staff':'discover');
  }catch(error){$('#connection-status').textContent='Connection unavailable';renderError(error);}
}
setInterval(()=>{if(!document.hidden)refreshOrders(true);},10000);
init();
