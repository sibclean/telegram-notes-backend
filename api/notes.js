import { kv } from '@vercel/kv';
import fetch from 'node-fetch';

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

  if (req.method === 'GET') {
    try {
      const notes = await kv.hgetall('amazon-notes');
      return res.status(200).json(notes || {});
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch notes from KV.' });
    }
  }

  if (req.method === 'POST') {
    const { name, comment } = req.body;
    if (!name) {
      return res.status(400).send('Name is required');
    }
    try {
      await kv.hset('amazon-notes', { [name]: comment || '' });
      if (BOT_TOKEN && CHAT_ID) {
        const text = `📝 Новая/обновленная заметка:\n\n*Оператор:* ${name}\n*Комментарий:* ${comment || '(пусто)'}`;
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
        await fetch(url);
      }
      return res.status(200).json({ success: true, message: 'Note saved.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to save note or send notification.' });
    }
  }

  return res.status(405).send('Method Not Allowed');
}

export default allowCors(handler);
