import { kv } from '@vercel/kv';
import fetch from 'node-fetch';

// Эта функция нужна, чтобы разрешить вашему скрипту Tampermonkey обращаться к серверу
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Разрешаем доступ с любого источника
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Браузер сначала отправляет "проверочный" OPTIONS-запрос
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// Основная логика нашего API
async function handler(req, res) {
  // САМОЕ ВАЖНОЕ: Получаем секреты из переменных окружения Vercel
  const { BOT_TOKEN, CHAT_ID } = process.env;

  // Если пришел GET-запрос (загрузка заметок)
  if (req.method === 'GET') {
    try {
      const notes = await kv.hgetall('amazon-notes');
      return res.status(200).json(notes || {});
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch notes from KV.' });
    }
  }

  // Если пришел POST-запрос (сохранение новой заметки)
  if (req.method === 'POST') {
    const { name, comment } = req.body;
    if (!name) {
      return res.status(400).send('Name is required');
    }

    try {
      // Сохраняем в базу данных
      await kv.hset('amazon-notes', { [name]: comment || '' });

      // Отправляем уведомление в Telegram, если токен и ID заданы
      if (BOT_TOKEN && CHAT_ID) {
        const text = `📝 Новая/обновленная заметка:\n\n*Оператор:* ${name}\n*Комментарий:* ${comment || '(пусто)'}`;
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
        
        // Используем fetch для отправки запроса в Telegram
        await fetch(url);
      }
      return res.status(200).json({ success: true, message: 'Note saved.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to save note or send notification.' });
    }
  }

  // Если метод запроса не GET и не POST
  return res.status(405).send('Method Not Allowed');
}

// "Оборачиваем" нашу логику в функцию allowCors
export default allowCors(handler);
