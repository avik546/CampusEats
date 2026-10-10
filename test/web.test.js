const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createApp}=require('../server');

test('connected ordering workflow, access control, validation and persistence',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'campuseats-test-'));
  const database=path.join(directory,'test.db');
  let server;
  let base;
  async function start(){server=createApp(database);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;}
  async function stop(){await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
  async function request(route,{method='GET',data,cookie,origin}={}){
    const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json','X-Campus-Request':'1',...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},...(data?{body:JSON.stringify(data)}:{})});
    return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  try{
    await start();
    assert.equal((await request('/api/health')).body.database,'connected');
    assert.equal((await fetch(base+'/')).status,200);
    assert.equal((await request('/api/shops')).body.shops.length,6);
    const menu=(await request('/api/shops/1/menu')).body.items;
    assert.equal(menu.length,4);
    assert.equal((await request('/api/orders')).status,401);
    assert.equal((await request('/api/login',{method:'POST',data:{email:'student@campus.local',password:'wrong'}})).status,401);
    assert.equal((await request('/api/register',{method:'POST',data:{name:'Test Student',email:'test@campus.local',password:'short'}})).status,400);
    const student=await request('/api/register',{method:'POST',data:{name:'Test Student',email:'test@campus.local',password:'test12345'}});
    assert.equal(student.body.user.role,'student');
    assert.ok(student.cookie);
    assert.equal((await request('/api/session',{cookie:student.cookie})).body.user.name,'Test Student');
    assert.equal((await request('/api/register',{method:'POST',data:{name:'Test Student',email:'test@campus.local',password:'test12345'}})).status,409);
    const payload={items:[{id:menu[0].id,quantity:2,price_paise:1}],recipient:'Test Student',phone:'9876543210',location:'Hostel A',room:'204',instructions:'Meet by the entrance',request_key:'test-order-1'};
    assert.equal((await request('/api/orders',{method:'POST',data:{...payload,location:'Outside campus'},cookie:student.cookie})).status,400);
    assert.equal((await request('/api/orders',{method:'POST',data:[],cookie:student.cookie})).status,400);
    assert.equal((await request('/api/orders',{method:'POST',data:{...payload,items:[null]},cookie:student.cookie})).status,400);
    assert.equal((await request('/api/orders',{method:'POST',data:payload,cookie:student.cookie,origin:'http://untrusted.example'})).status,403);
    const created=await request('/api/orders',{method:'POST',data:payload,cookie:student.cookie});
    assert.equal(created.status,201);
    assert.equal(created.body.order.total_paise,menu[0].price_paise*2+1500);
    assert.equal(created.body.order.items[0].quantity,2);
    assert.equal((await request('/api/orders',{method:'POST',data:payload,cookie:student.cookie})).body.order.id,created.body.order.id);
    assert.equal((await request('/api/orders',{cookie:student.cookie})).body.orders.length,1);
    assert.equal((await request('/api/orders',{method:'POST',cookie:student.cookie,data:{...payload,request_key:'bad-quantity',items:[{id:menu[0].id,quantity:-1}]}})).status,400);
    const anotherMenu=(await request('/api/shops/2/menu')).body.items;
    assert.equal((await request('/api/orders',{method:'POST',cookie:student.cookie,data:{...payload,request_key:'mixed-shops',items:[{id:menu[0].id,quantity:1},{id:anotherMenu[0].id,quantity:1}]}})).status,400);
    const id=created.body.order.id;
    assert.equal((await request(`/api/orders/${id}/status`,{method:'PATCH',data:{status:'accepted'},cookie:student.cookie})).status,403);
    const staff=await request('/api/login',{method:'POST',data:{email:'staff@campus.local',password:'staff1234'}});
    assert.equal((await request(`/api/orders/${id}/status`,{method:'PATCH',data:{status:'delivered'},cookie:staff.cookie})).status,400);
    for(const status of ['accepted','preparing','out_for_delivery','delivered']){
      assert.equal((await request(`/api/orders/${id}/status`,{method:'PATCH',data:{status},cookie:staff.cookie})).body.order.status,status);
    }
    assert.equal((await request(`/api/orders/${id}/status`,{method:'PATCH',data:{status:'cancelled'},cookie:staff.cookie})).status,400);
    assert.equal((await request(`/api/menu-items/${menu[0].id}/availability`,{method:'PATCH',cookie:student.cookie,data:{available:false}})).status,403);
    assert.equal((await request(`/api/menu-items/${menu[0].id}/availability`,{method:'PATCH',cookie:staff.cookie,data:{available:false}})).status,200);
    assert.equal((await request('/api/orders',{method:'POST',cookie:student.cookie,data:{...payload,request_key:'unavailable'}})).status,400);
    const other=await request('/api/login',{method:'POST',data:{email:'student@campus.local',password:'student123'}});
    assert.equal((await request('/api/orders',{cookie:other.cookie})).body.orders.length,0);
    await stop();await start();
    const persisted=(await request('/api/orders',{cookie:student.cookie})).body.orders[0];
    assert.equal(persisted.status,'delivered');assert.equal(persisted.events.length,5);assert.equal(persisted.room,'204');
    await request('/api/logout',{method:'POST',data:{},cookie:student.cookie});
    assert.equal((await request('/api/orders',{cookie:student.cookie})).status,401);
  }finally{if(server?.listening)await stop();fs.rmSync(directory,{recursive:true,force:true});}
});
