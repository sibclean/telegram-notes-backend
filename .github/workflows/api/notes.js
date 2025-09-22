import { kv } from '@vercel/kv';
import fetch from 'node-fetch';

// Разрешаем CORS, чтобы скрипт из браузера мог обращаться к серверу
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

async function handler(req, res) {
  const { BOT_TOKEN, CHAT_ID } = process.env;

  // Получаем все заметки
  if (req.method === 'GET') {
    const notes = await kv.hgetall('amazon-notes');
    return res.status(200).json(notes || {});
  }

  // Сохраняем новую заметку
  if (req.method === 'POST') {
    const { name, comment } = req.body;
    if (!name) {
      return res.status(400).send('Name is required');
    }

    await kv.hset('amazon-notes', { [name]: comment });

    // Отправляем уведомление в Telegram
    if (BOT_TOKEN && CHAT_ID) {
      const text = `📝 Новая заметка:\n\n*Оператор:* ${name}\n*Комментарий:* ${comment || '(пусто)'}`;
      const url = `https://api.telegram.org/bot${8314613767:AAFscQLd4LHn88UVwAHEN79yQaaRWM0UjTM}/sendMessage?chat_id=${1009849089}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
      try {
        await fetch(url);
      } catch (e) {
        console.error("Telegram notification failed:", e);
      }
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).send('Method Not Allowed');
}

export default allowCors(handler);
