import { Application, Assets, Sprite, Container, Graphics, Text } from 'pixi.js';
import { db } from './firebase.js';
import {
  collection, addDoc, getDocs, doc, updateDoc, onSnapshot,
} from 'firebase/firestore';

const app = new Application();
let domForms = [];

async function init() {
  await app.init({
    resizeTo: window,
    background: '#000000',
  });

  document.body.appendChild(app.canvas);

  await Assets.load([
    'assets/main_bg.jpg',
    'assets/nofire.png',
    'assets/fire.png',
  ]);

  showLobby();
}

function clearDomForms() {
  domForms.forEach((f) => f.remove());
  domForms = [];
}

async function showLobby() {
  app.stage.removeChildren();
  clearDomForms();
  app.canvas.style.cursor = 'default';

  const lobby = new Container();
  app.stage.addChild(lobby);

  const bg = new Graphics();
  bg.rect(0, 0, app.screen.width, app.screen.height);
  bg.fill('#1a1a2e');
  lobby.addChild(bg);

  const title = new Text({ text: 'Церкви', style: { fontSize: 32, fill: '#ffffff', fontFamily: 'Arial' } });
  title.anchor.set(0.5, 0);
  title.x = app.screen.width / 2;
  title.y = 30;
  lobby.addChild(title);

  const startY = 100;
  const cardHeight = 60;
  const gap = 15;

  const roomsSnap = await getDocs(collection(db, 'rooms'));
  const rooms = [];
  roomsSnap.forEach((d) => rooms.push({ id: d.id, ...d.data() }));

  rooms.forEach((room, i) => {
    const card = new Container();
    card.y = startY + i * (cardHeight + gap);
    card.x = app.screen.width / 2 - 150;

    const cardBg = new Graphics();
    cardBg.roundRect(0, 0, 300, cardHeight, 8);
    cardBg.fill('#16213e');
    card.addChild(cardBg);

    const label = new Text({
      text: room.name,
      style: { fontSize: 18, fill: '#e0e0e0', fontFamily: 'Arial' },
    });
    label.x = 15;
    label.y = (cardHeight - label.height) / 2;
    card.addChild(label);

    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.on('pointerdown', () => showRoom(room));

    lobby.addChild(card);
  });

  const btnY = startY + rooms.length * (cardHeight + gap) + 10;
  const btn = new Container();
  btn.x = app.screen.width / 2 - 100;
  btn.y = btnY;

  const btnBg = new Graphics();
  btnBg.roundRect(0, 0, 200, 50, 8);
  btnBg.fill('#0f3460');
  btn.addChild(btnBg);

  const btnText = new Text({
    text: '+ Новая Церковь',
    style: { fontSize: 18, fill: '#e0e0e0', fontFamily: 'Arial' },
  });
  btnText.x = (200 - btnText.width) / 2;
  btnText.y = (50 - btnText.height) / 2;
  btn.addChild(btnText);

  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.on('pointerdown', () => {
    const input = document.createElement('input');
    input.placeholder = 'Название церкви';
    input.style.cssText = `
      position: absolute;
      left: ${btn.x}px;
      top: ${btn.y + 60}px;
      padding: 8px 12px;
      font-size: 16px;
      width: 200px;
      border: 1px solid #ccc;
      border-radius: 6px;
      outline: none;
    `;
    document.body.appendChild(input);
    domForms.push(input);
    requestAnimationFrame(() => input.focus());

    let created = false;
    const createRoom = async () => {
      if (created) return;
      created = true;
      const name = input.value.trim() || `Церковь ${rooms.length + 1}`;
      input.remove();
      const docRef = await addDoc(collection(db, 'rooms'), { name });
      showRoom({ id: docRef.id, name });
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createRoom();
      if (e.key === 'Escape') { input.remove(); }
    });

    setTimeout(() => {
      input.addEventListener('blur', () => {
        if (document.body.contains(input)) createRoom();
      });
    }, 200);
  });

  lobby.addChild(btn);

  window.onresize = () => {
    bg.clear();
    bg.rect(0, 0, app.screen.width, app.screen.height);
    bg.fill('#1a1a2e');
    title.x = app.screen.width / 2;
  };
}

async function showRoom(room) {
  app.stage.removeChildren();
  clearDomForms();

  const scene = new Container();
  app.stage.addChild(scene);

  const bgTexture = Assets.get('assets/main_bg.jpg');
  const bg = new Sprite(bgTexture);
  bg.width = app.screen.width;
  bg.height = app.screen.height;
  bg.eventMode = 'static';
  scene.addChild(bg);

  const nofireTexture = Assets.get('assets/nofire.png');
  const cursor = new Sprite(nofireTexture);
  cursor.anchor.set(0.5);
  cursor.scale.set(0.5);
  cursor.visible = false;
  scene.addChild(cursor);

  const fireTexture = Assets.get('assets/fire.png');

  const candlesRef = collection(db, 'rooms', room.id, 'candles');
  const candlesSnap = await getDocs(candlesRef);
  candlesSnap.forEach((d) => {
    spawnCandle({ id: d.id, ...d.data() }, room.id, scene, fireTexture);
  });

  bg.on('pointerenter', () => {
    cursor.visible = true;
    app.canvas.style.cursor = 'none';
  });

  bg.on('pointerleave', () => {
    cursor.visible = false;
    app.canvas.style.cursor = 'default';
  });

  bg.on('pointermove', (e) => {
    cursor.position.copyFrom(e.global);
  });

  bg.on('pointerdown', async (e) => {
    const candle = { x: e.global.x, y: e.global.y, name: '', note: '' };
    const docRef = await addDoc(candlesRef, candle);
    candle.id = docRef.id;
    spawnCandle(candle, room.id, scene, fireTexture);
  });

  const backBtn = new Container();
  backBtn.x = 15;
  backBtn.y = 15;

  const backBg = new Graphics();
  backBg.roundRect(0, 0, 100, 36, 6);
  backBg.fill({ color: '#000000', alpha: 0.5 });
  backBtn.addChild(backBg);

  const backText = new Text({
    text: '← Лобби',
    style: { fontSize: 16, fill: '#ffffff', fontFamily: 'Arial' },
  });
  backText.x = (100 - backText.width) / 2;
  backText.y = (36 - backText.height) / 2;
  backBtn.addChild(backText);

  backBtn.eventMode = 'static';
  backBtn.cursor = 'pointer';
  backBtn.on('pointerdown', () => showLobby());
  scene.addChild(backBtn);

  window.onresize = () => {
    bg.width = app.screen.width;
    bg.height = app.screen.height;
  };
}

function spawnCandle(candle, roomId, scene, fireTexture) {
  const fire = new Sprite(fireTexture);
  fire.anchor.set(0.5);
  fire.scale.set(0.5);
  fire.position.set(candle.x, candle.y);
  fire.eventMode = 'static';
  scene.addChild(fire);

  const form = document.createElement('div');
  form.style.cssText = `
    position: absolute;
    left: ${candle.x + 20}px;
    top: ${candle.y - 20}px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `;

  const input1 = document.createElement('input');
  input1.placeholder = 'Имя Фамилия';
  input1.value = candle.name;
  input1.style.cssText = 'padding: 4px 8px; font-size: 14px; width: 150px; border: 1px solid #ccc; border-radius: 4px; opacity: 0.7;';

  const input2 = document.createElement('textarea');
  input2.value = candle.note;
  input2.rows = 1;
  input2.style.cssText = 'padding: 4px 8px; font-size: 14px; width: 150px; border: 1px solid #ccc; border-radius: 4px; opacity: 0.7; resize: none; overflow: hidden; font-family: Arial, sans-serif;';
  input2.addEventListener('input', () => {
    input2.style.height = 'auto';
    input2.style.height = input2.scrollHeight + 'px';
  });

  form.appendChild(input1);
  form.appendChild(input2);
  document.body.appendChild(form);
  domForms.push(form);

  requestAnimationFrame(() => {
    input2.style.height = 'auto';
    input2.style.height = input2.scrollHeight + 'px';
  });

  if (candle.name && candle.note) {
    form.style.display = 'none';
  }

  const candleDoc = doc(db, 'rooms', roomId, 'candles', candle.id);

  input1.addEventListener('input', () => {
    candle.name = input1.value;
    updateDoc(candleDoc, { name: input1.value });
  });

  input2.addEventListener('input', () => {
    candle.note = input2.value;
    updateDoc(candleDoc, { note: input2.value });
  });

  const hideIfFilled = () => {
    if (input1.value.trim() && input2.value.trim()) {
      form.style.display = 'none';
    }
  };

  input1.addEventListener('blur', hideIfFilled);
  input2.addEventListener('blur', hideIfFilled);

  fire.on('pointerenter', () => {
    form.style.display = 'flex';
  });

  fire.on('pointerleave', () => {
    if (input1.value.trim() && input2.value.trim()) {
      form.style.display = 'none';
    }
  });
}

init();
