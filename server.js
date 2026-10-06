const express=require("express"),path=require("path"),Database=require("better-sqlite3"),jwt=require("jsonwebtoken");

const app=express();
const db=new Database("namaste.db");

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

const PORT=process.env.PORT||3000;
const SECRET=process.env.JWT_SECRET||"CHANGE_THIS_SECRET";
const USER=process.env.ADMIN_USER||"admin";
const PASS=process.env.ADMIN_PASSWORD||"namaste123";

db.exec(`
CREATE TABLE IF NOT EXISTS store(
id INTEGER PRIMARY KEY CHECK(id=1),
name TEXT,phone TEXT,whatsapp TEXT,upi TEXT,address TEXT,maps TEXT
);

CREATE TABLE IF NOT EXISTS products(
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT,category TEXT,price REAL DEFAULT 0,
icon TEXT,stock INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders(
id INTEGER PRIMARY KEY AUTOINCREMENT,
customer_name TEXT,phone TEXT,note TEXT,
total REAL DEFAULT 0,status TEXT DEFAULT 'NEW',
created_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items(
id INTEGER PRIMARY KEY AUTOINCREMENT,
order_id INTEGER,product_id INTEGER,
name TEXT,qty INTEGER,price REAL
);
`);

if(!db.prepare("SELECT 1 FROM store WHERE id=1").get()){
  db.prepare("INSERT INTO store VALUES(1,?,?,?,?,?,?)").run(
    "Namaste Tradelink",
    "9833667188",
    "919833667188",
    "",
    "MSEB Office, Tejashree, 6 Balaji Paradise, near Commissioner Bungalow, Kalyan, Maharashtra",
    "https://www.google.com/maps/search/?api=1&query=Namaste+Tradelink+Kalyan"
  );
}

if(db.prepare("SELECT COUNT(*) c FROM products").get().c===0){
  let add=db.prepare(
    "INSERT INTO products(name,category,price,icon,stock) VALUES(?,?,?,?,?)"
  );

  [
    ["Budget Smartphone","Mobiles",0,"📱",0],
    ["5G Smartphone","Mobiles",0,"📱",0],
    ["Premium Smartphone","Mobiles",0,"📱",0],
    ["TWS Earbuds","Audio",0,"🎧",0],
    ["Bluetooth Speaker","Audio",0,"🔊",0],
    ["Fast Charger","Accessories",0,"🔌",0],
    ["USB Type-C Cable","Accessories",0,"🔗",0],
    ["Power Bank","Accessories",0,"🔋",0],
    ["Phone Cover","Accessories",0,"📱",0],
    ["Screen Protector","Accessories",0,"🛡️",0],
    ["Smartwatch","Wearables",0,"⌚",0]
  ].forEach(x=>add.run(...x));
}

function auth(req,res,next){
  try{
    jwt.verify(
      (req.headers.authorization||"").replace("Bearer ",""),
      SECRET
    );
    next();
  }catch(e){
    res.status(401).json({error:"Unauthorized"});
  }
}

app.post("/api/login",(req,res)=>{
  if(req.body.username===USER && req.body.password===PASS){
    return res.json({
      token:jwt.sign({u:USER},SECRET,{expiresIn:"12h"})
    });
  }

  res.status(401).json({error:"Invalid login"});
});

app.get("/api/store",(req,res)=>{
  res.json({
    store:db.prepare("SELECT * FROM store WHERE id=1").get(),
    products:db.prepare("SELECT * FROM products ORDER BY id DESC").all()
  });
});

app.get("/api/admin",auth,(req,res)=>{
  let orders=db.prepare("SELECT * FROM orders ORDER BY id DESC").all().map(o=>({
    ...o,
    total:Number(o.total),
    items:db.prepare(
      "SELECT name,qty,price FROM order_items WHERE order_id=?"
    ).all(o.id)
  }));

  let stats={
    orders:orders.length,
    value:orders.reduce((a,o)=>a+o.total,0),
    stock:db.prepare(
      "SELECT COALESCE(SUM(stock),0) s FROM products"
    ).get().s
  };

  res.json({
    store:db.prepare("SELECT * FROM store WHERE id=1").get(),
    products:db.prepare("SELECT * FROM products ORDER BY id DESC").all(),
    orders,
    stats
  });
});

app.put("/api/store",auth,(req,res)=>{
  let s=req.body;

  db.prepare(`
    UPDATE store
    SET name=?,phone=?,whatsapp=?,upi=?,address=?,maps=?
    WHERE id=1
  `).run(
    s.name,
    s.phone,
    s.whatsapp,
    s.upi||"",
    s.address,
    s.maps
  );

  res.json({ok:true});
});

app.post("/api/products",auth,(req,res)=>{
  let x=req.body;

  let r=db.prepare(`
    INSERT INTO products(name,category,price,icon,stock)
    VALUES(?,?,?,?,?)
  `).run(
    x.name,
    x.category,
    x.price||0,
    x.icon||"📦",
    x.stock||0
  );

  res.json({id:r.lastInsertRowid});
});

app.put("/api/products/:id",auth,(req,res)=>{
  let x=req.body;

  db.prepare(`
    UPDATE products
    SET name=?,category=?,price=?,icon=?,stock=?
    WHERE id=?
  `).run(
    x.name,
    x.category,
    x.price||0,
    x.icon||"📦",
    x.stock||0,
    req.params.id
  );

  res.json({ok:true});
});

app.post("/api/orders",(req,res)=>{
  let {name,phone,note,items}=req.body||{};

  if(!Array.isArray(items)||!items.length){
    return res.status(400).json({error:"No items"});
  }

  let total=0;
  let rows=[];

  for(let i of items){
    let p=db.prepare(
      "SELECT * FROM products WHERE id=?"
    ).get(i.id);

    if(!p) continue;

    total+=p.price*i.qty;
    rows.push([p.id,p.name,i.qty,p.price]);
  }

  let r=db.prepare(`
    INSERT INTO orders(
      customer_name,phone,note,total,status,created_at
    )
    VALUES(?,?,?,?,?,datetime('now','localtime'))
  `).run(
    name||"Customer",
    phone||"",
    note||"",
    total,
    "NEW"
  );

  let add=db.prepare(`
    INSERT INTO order_items(
      order_id,product_id,name,qty,price
    )
    VALUES(?,?,?,?,?)
  `);

  rows.forEach(x=>add.run(r.lastInsertRowid,...x));

  res.json({
    id:r.lastInsertRowid,
    total
  });
});

app.patch("/api/orders/:id",auth,(req,res)=>{
  db.prepare(
    "UPDATE orders SET status=? WHERE id=?"
  ).run(
    req.body.status,
    req.params.id
  );

  res.json({ok:true});
});

app.listen(PORT,"0.0.0.0",()=>{
  console.log(
    "Namaste Tradelink running on port "+PORT
  );
});
