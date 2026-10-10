const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const STATUSES = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
const LOCATIONS = ['Hostel A','Hostel B','Hostel C','Academic Block','Library Courtyard','Student Centre','Sports Complex'];
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return salt + ':' + crypto.scryptSync(password, salt, 64).toString('hex');
}
function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function createApp(databasePath = path.join(ROOT, 'database', 'campuseats-web.db')) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','staff')));
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
      emoji TEXT NOT NULL, color TEXT NOT NULL, eta TEXT NOT NULL, location TEXT NOT NULL,
      is_open INTEGER NOT NULL DEFAULT 1 CHECK(is_open IN (0,1)));
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY, shop_id INTEGER NOT NULL REFERENCES shops(id), name TEXT NOT NULL,
      description TEXT NOT NULL, price_paise INTEGER NOT NULL CHECK(price_paise>0), emoji TEXT NOT NULL,
      vegetarian INTEGER NOT NULL CHECK(vegetarian IN (0,1)), category TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1 CHECK(available IN (0,1)));
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), shop_id INTEGER NOT NULL REFERENCES shops(id),
      status TEXT NOT NULL DEFAULT 'placed' CHECK(status IN ('placed','accepted','preparing','out_for_delivery','delivered','cancelled')),
      subtotal_paise INTEGER NOT NULL, delivery_fee_paise INTEGER NOT NULL, total_paise INTEGER NOT NULL,
      recipient TEXT NOT NULL, phone TEXT NOT NULL, location TEXT NOT NULL, room TEXT NOT NULL, instructions TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery', request_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(user_id,request_key));
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      name TEXT NOT NULL, unit_price_paise INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 20));
    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
    CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id,created_at);
    CREATE INDEX IF NOT EXISTS orders_status ON orders(status,created_at);
    CREATE INDEX IF NOT EXISTS menu_shop ON menu_items(shop_id);
    CREATE INDEX IF NOT EXISTS events_order ON order_events(order_id);
  `);
  if (!db.prepare('SELECT id FROM shops LIMIT 1').get()) {
    db.exec('BEGIN');
    try {
      const shop = db.prepare('INSERT INTO shops VALUES(?,?,?,?,?,?,?,?,1)');
      [
        [1, 'Food Haven', 'Burgers & bites', 'Your between-lectures comfort food.', '🍔', 'peach', '15–20 min', 'Student Centre'],
        [2, 'Zorkko', 'Pizza & pasta', 'Big slices. Good company.', '🍕', 'yellow', '20–25 min', 'Main Canteen'],
        [3, 'Periodt', 'Street food', 'A little spice for your study break.', '🌮', 'pink', '10–15 min', 'Library Courtyard'],
        [4, 'Food Paradise', 'Noodles & bowls', 'Warm bowls for long campus days.', '🍜', 'green', '20–30 min', 'Main Canteen'],
        [5, 'Campus Bites', 'Coffee & sandwiches', 'Fuel for your next great idea.', '🥪', 'purple', '10–15 min', 'Academic Block'],
        [6, 'Quick Meals', 'Wraps & chicken', 'A proper meal, without the wait.', '🌯', 'blue', '10–20 min', 'Hostel Square']
      ].forEach(row => shop.run(...row));
      const item = db.prepare('INSERT INTO menu_items(shop_id,name,description,price_paise,emoji,vegetarian,category) VALUES(?,?,?,?,?,?,?)');
      [
        [1,'Classic Veg Burger','Crisp veggie patty, lettuce & house sauce',12000,'🍔',1,'Burgers'],
        [1,'Chicken Burger','Grilled chicken, cheese & pepper mayo',15000,'🍔',0,'Burgers'],
        [1,'Crispy Fries','Golden fries with a pinch of sea salt',8000,'🍟',1,'Sides'],
        [1,'Chocolate Shake','Chocolate, chilled milk & a happy break',11000,'🥤',1,'Drinks'],
        [2,'Margherita Pizza','Tomato, mozzarella & fresh basil',18000,'🍕',1,'Pizza'],
        [2,'Farmhouse Pizza','Peppers, onion, mushrooms & mozzarella',22000,'🍕',1,'Pizza'],
        [2,'Creamy Alfredo Pasta','Penne in a creamy garlic sauce',16000,'🍝',1,'Pasta'],
        [2,'Garlic Bread','Toasted bread with garlic butter',7000,'🥖',1,'Sides'],
        [3,'Paneer Roll','Spiced paneer, crunchy onion & chutney',10000,'🌯',1,'Street food'],
        [3,'Samosa Chaat','Samosa, chickpeas, yoghurt & chutneys',7000,'🥙',1,'Street food'],
        [3,'Masala Maggi','Your favourite noodles with a spicy twist',6000,'🍜',1,'Street food'],
        [3,'Fresh Lime Soda','A zesty, fizzy campus cooler',5000,'🍋',1,'Drinks'],
        [4,'Veg Hakka Noodles','Wok-tossed noodles & crunchy vegetables',13000,'🍜',1,'Bowls'],
        [4,'Chicken Fried Rice','Fried rice with chicken & vegetables',16000,'🍚',0,'Bowls'],
        [4,'Paneer Rice Bowl','Paneer, steamed rice & a rich gravy',15000,'🍛',1,'Bowls'],
        [4,'Veg Momos','Six steamed dumplings with chilli dip',9000,'🥟',1,'Sides'],
        [5,'Grilled Cheese Sandwich','Melty cheese on toasted bread',9000,'🥪',1,'Sandwiches'],
        [5,'Club Sandwich','Vegetables, cheese & a triple toast stack',12000,'🥪',1,'Sandwiches'],
        [5,'Cold Coffee','Creamy iced coffee for an afternoon lift',9000,'☕',1,'Drinks'],
        [5,'Chocolate Brownie','A soft, fudgy chocolate square',6000,'🍫',1,'Desserts'],
        [6,'Chicken Wrap','Chicken, fresh salad & signature sauce',14000,'🌯',0,'Wraps'],
        [6,'Paneer Wrap','Grilled paneer, salad & mint mayo',12000,'🌯',1,'Wraps'],
        [6,'Crispy Chicken','Three crispy chicken strips with dip',15000,'🍗',0,'Sides'],
        [6,'Mango Cooler','Chilled mango drink, sunshine included',6000,'🥭',1,'Drinks']
      ].forEach(row => item.run(...row));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const seedUser = db.prepare('INSERT OR IGNORE INTO users(name,email,password_hash,role) VALUES(?,?,?,?)');
  seedUser.run('Campus Student','student@campus.local',hashPassword('student123'),'student');
  seedUser.run('Canteen Manager','staff@campus.local',hashPassword('staff1234'),'staff');
  const safeUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });
  function getUser(req) {
    const cookie = /(?:^|;\s*)campuseats_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '');
    if (!cookie) return null;
    return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?').get(cookie[1],Date.now()) || null;
  }
  function orderDetails(order) {
    return { ...order, shop_name: db.prepare('SELECT name FROM shops WHERE id=?').get(order.shop_id).name,
      items: db.prepare('SELECT menu_item_id,name,unit_price_paise,quantity FROM order_items WHERE order_id=?').all(order.id),
      events: db.prepare('SELECT status,created_at FROM order_events WHERE order_id=? ORDER BY id').all(order.id) };
  }
  function fail(message, status=400) { const error = new Error(message); error.status = status; throw error; }
  async function body(req) {
    let buffer = '';
    for await (const chunk of req) { buffer += chunk; if (Buffer.byteLength(buffer)>32768) fail('Request is too large.',413); }
    let data;
    try { data = JSON.parse(buffer || '{}'); } catch { fail('Invalid request JSON.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Send a JSON object.');
    return data;
  }
  function textField(value,label,max=120) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length>max) fail(`Please enter a valid ${label}.`);
    return value.trim();
  }
  const attempts = new Map();
  const server = http.createServer(async (req,res) => {
    const json = (value,status=200,headers={}) => {
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
      res.end(JSON.stringify(value));
    };
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const url = new URL(req.url,'http://localhost');
      const route = url.pathname;
      if (!['GET','HEAD'].includes(req.method)) {
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) fail('Request origin is not allowed.',403);
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') fail('Send application/json.',415);
        if (!req.headers['x-campus-request']) fail('Missing request header.',403);
      }
      if (route === '/api/health' && req.method==='GET') return json({ok:true,database:'connected'});
      if ((route==='/api/login' || route==='/api/register') && req.method==='POST') {
        const key = req.socket.remoteAddress;
        const now = Date.now();
        let attempt = attempts.get(key);
        if (!attempt || now-attempt.start>600000) { attempt={count:0,start:now}; attempts.set(key,attempt); }
        if (++attempt.count>30) fail('Too many sign-in attempts. Try again in 10 minutes.',429);
        const data = await body(req);
        const email = textField(data.email,'email').toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.');
        if (typeof data.password!=='string' || data.password.length>128) fail('Enter a valid password.');
        let user;
        if (route==='/api/register') {
          const name = textField(data.name,'name',80);
          if(data.password.length<8) fail('Use a password with at least 8 characters.');
          if(db.prepare('SELECT id FROM users WHERE email=?').get(email)) fail('This email already has an account.',409);
          const result=db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(name,email,hashPassword(data.password),'student');
          user=db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);
        } else {
          user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
          if(!user || !checkPassword(data.password,user.password_hash)) fail('Incorrect email or password.',401);
        }
        const token=crypto.randomBytes(32).toString('hex');
        db.prepare('DELETE FROM sessions WHERE expires_at<?').run(now);
        db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token,user.id,now+86400000);
        return json({user:safeUser(user)},200,{'Set-Cookie':`campuseats_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`});
      }
      const user = getUser(req);
      if(route==='/api/session' && req.method==='GET') return json({user:user?safeUser(user):null});
      if(route==='/api/logout' && req.method==='POST') {
        const cookie=/(?:^|;\s*)campuseats_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'');
        if(cookie) db.prepare('DELETE FROM sessions WHERE token=?').run(cookie[1]);
        return json({ok:true},200,{'Set-Cookie':'campuseats_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});
      }
      if(route==='/api/shops' && req.method==='GET') return json({shops:db.prepare('SELECT * FROM shops ORDER BY id').all()});
      const menuMatch=route.match(/^\/api\/shops\/(\d+)\/menu$/);
      if(menuMatch && req.method==='GET') {
        const shop=db.prepare('SELECT * FROM shops WHERE id=?').get(Number(menuMatch[1]));
        if(!shop) fail('Shop not found.',404);
        return json({shop,items:db.prepare('SELECT * FROM menu_items WHERE shop_id=? ORDER BY id').all(shop.id)});
      }
      if(route.startsWith('/api/')) {
        if(!user) fail('Please sign in to continue.',401);
        if(route==='/api/orders' && req.method==='GET') {
          const rows=user.role==='staff'?db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all():db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 100').all(user.id);
          return json({orders:rows.map(orderDetails)});
        }
        if(route==='/api/orders' && req.method==='POST') {
          if(user.role!=='student') fail('Use a student account to order.',403);
          const data=await body(req);
          const requestKey=textField(data.request_key,'order reference',80);
          const previous=db.prepare('SELECT * FROM orders WHERE user_id=? AND request_key=?').get(user.id,requestKey);
          if(previous) return json({order:orderDetails(previous)});
          if(!Array.isArray(data.items) || !data.items.length || data.items.length>30) fail('Add items to your cart first.');
          const recipient=textField(data.recipient,'recipient name',80);
          const phone=textField(data.phone,'phone number',20);
          if(!/^[6-9]\d{9}$/.test(phone)) fail('Enter a 10-digit Indian mobile number.');
          const location=textField(data.location,'campus delivery location',80);
          if (!LOCATIONS.includes(location)) fail('Choose a delivery location inside campus.');
          const room=textField(data.room,'room or meeting point',80);
          const instructions=typeof data.instructions==='string'?data.instructions.trim():'';
          if(instructions.length>300) fail('Keep delivery instructions under 300 characters.');
          const seen=new Set();
          const items=data.items.map(input=>{
            if(!input || typeof input!=='object' || Array.isArray(input)) fail('Invalid cart item.');
            if(!Number.isSafeInteger(input.id) || !Number.isInteger(input.quantity) || input.quantity<1 || input.quantity>20 || seen.has(input.id)) fail('Invalid cart quantity or duplicate item.');
            seen.add(input.id);
            const item=db.prepare('SELECT * FROM menu_items WHERE id=?').get(input.id);
            if(!item || !item.available) fail('An item is unavailable. Please refresh your menu.');
            return {...item,quantity:input.quantity};
          });
          const shopId=items[0].shop_id;
          if(items.some(i=>i.shop_id!==shopId)) fail('Please order from one shop at a time.');
          const shop=db.prepare('SELECT * FROM shops WHERE id=?').get(shopId);
          if(!shop.is_open) fail('This shop is currently closed.');
          const subtotal=items.reduce((sum,i)=>sum+i.price_paise*i.quantity,0);
          const deliveryFee=1500;
          let id;
          db.exec('BEGIN IMMEDIATE');
          try {
            const result=db.prepare('INSERT INTO orders(user_id,shop_id,subtotal_paise,delivery_fee_paise,total_paise,recipient,phone,location,room,instructions,request_key) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(user.id,shopId,subtotal,deliveryFee,subtotal+deliveryFee,recipient,phone,location,room,instructions,requestKey);
            id=Number(result.lastInsertRowid);
            const insert=db.prepare('INSERT INTO order_items(order_id,menu_item_id,name,unit_price_paise,quantity) VALUES(?,?,?,?,?)');
            items.forEach(i=>insert.run(id,i.id,i.name,i.price_paise,i.quantity));
            db.prepare('INSERT INTO order_events(order_id,status) VALUES(?,?)').run(id,'placed');
            db.exec('COMMIT');
          } catch(error) {db.exec('ROLLBACK');throw error;}
          return json({order:orderDetails(db.prepare('SELECT * FROM orders WHERE id=?').get(id))},201);
        }
        const statusMatch=route.match(/^\/api\/orders\/(\d+)\/status$/);
        if(statusMatch && req.method==='PATCH') {
          if(user.role!=='staff') fail('Only shop staff can update orders.',403);
          const order=db.prepare('SELECT * FROM orders WHERE id=?').get(Number(statusMatch[1]));
          if(!order) fail('Order not found.',404);
          const data=await body(req);
          const next=STATUSES[STATUSES.indexOf(order.status)+1];
          if(['delivered','cancelled'].includes(order.status) || (data.status!==next && data.status!=='cancelled')) fail('Invalid order status change. Refresh the order.');
          db.exec('BEGIN IMMEDIATE');
          try {
            db.prepare('UPDATE orders SET status=? WHERE id=?').run(data.status,order.id);
            db.prepare('INSERT INTO order_events(order_id,status) VALUES(?,?)').run(order.id,data.status);
            db.exec('COMMIT');
          } catch(error) {db.exec('ROLLBACK');throw error;}
          return json({order:orderDetails(db.prepare('SELECT * FROM orders WHERE id=?').get(order.id))});
        }
        const availableMatch=route.match(/^\/api\/menu-items\/(\d+)\/availability$/);
        if(availableMatch && req.method==='PATCH') {
          if(user.role!=='staff') fail('Only shop staff can update menus.',403);
          const data=await body(req);
          if(typeof data.available!=='boolean') fail('Invalid availability.');
          const result=db.prepare('UPDATE menu_items SET available=? WHERE id=?').run(data.available?1:0,Number(availableMatch[1]));
          if(!result.changes) fail('Item not found.',404);
          return json({ok:true});
        }
        fail('API route not found.',404);
      }
      if(!['GET','HEAD'].includes(req.method)) fail('Method not allowed.',405);
      const files={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.js':'app.js','/favicon.svg':'favicon.svg'};
      if(!files[route]) fail('Page not found.',404);
      const file=path.join(PUBLIC,files[route]);
      const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
      res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-cache'});
      res.end(req.method==='HEAD'?undefined:fs.readFileSync(file));
    } catch(error) {
      if(!error.status) console.error(error);
      if(!res.headersSent) json({error:error.status?error.message:'Something went wrong. Please try again.'},error.status||500);
      else res.end();
    }
  });
  server.on('close',()=>db.close());
  return server;
}
if(require.main===module) {
  const port=Number(process.env.PORT||3000);
  createApp().listen(port,'127.0.0.1',()=>console.log(`CampusEats is ready at http://localhost:${port}\nSQLite connected: database/campuseats-web.db`));
}
module.exports={createApp};
