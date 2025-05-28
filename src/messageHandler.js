import { Client } from '@gradio/client';
import fs from 'fs';
import path from 'path';

// Путь к файлу с предупреждени
const WARNINGS_FILE = path.resolve('warnings.json');

// Список пользователей, у которых нарушения игнорируются (например, владельцы группы или специальные пользователи)
const exemptUsers = [178999805]; // Замените эти числа на реальные ID пользователей

// Заданные триггерные слова
const triggers = [
  'курсы',
  'видеоуроки',
  'обучение',
  'поделюсь',
  'поделиться',
  'кто хочет',
  'кто-то хочет',
  'остались',
  'готов',
  'предоставить',
  'стратег',
  'осталась',
  'изучить',
  'пользу',
  'Если интересно',
  'могу',
  'пригодиться',
  'книг',
  'скину',
  'книга',
  'полезна',
  'польза',
  'пишите',
  'доп',
  'дополнительный',
  'заработка',
  'заработок',
  'оплата',
  'перешлю',
  'отдам',
  'подарок',
  'поделится',
  'требуются',
  'срочно',
  'личные',
  'подробнее',
  'в час',
  'пиши',
];

// Функция для загрузки предупреждений из файла
function loadWarnings() {
  try {
    if (fs.existsSync(WARNINGS_FILE)) {
      const data = fs.readFileSync(WARNINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Ошибка при загрузке предупреждений:', error);
  }
  return {};
}

// Функция для сохранения предупреждений в файл
function saveWarnings(warnings) {
  try {
    fs.writeFileSync(WARNINGS_FILE, JSON.stringify(warnings, null, 2));
  } catch (error) {
    console.error('Ошибка при сохранении предупреждений:', error);
  }
}

// Загружаем предупреждения при старте
let userWarnings = loadWarnings();

// Функция для проверки сообщения через API спама
// async function checkSpamWithAPI(text) {
//   try {
//     const client = await Client.connect('Subhajit01/spam_detection_poweredby_custom_GPT');
//     const result = await client.predict('/classify', {
//       text: text,
//     });

//     // Логируем ответ API для отладки
//     // console.log('API Response:', result);

//     // Обрабатываем ответ API
//     if (result.data && Array.isArray(result.data) && result.data[0]) {
//       const label = result.data[0].toLowerCase(); // Получаем первый элемент массива и приводим к нижнему регистру
//       return label === 'spam'; // Возвращаем true, если метка "spam"
//     }

//     // Если формат ответа неожиданный, возвращаем null
//     console.error('Неожиданный формат ответа API:', result);
//     return null;
//   } catch (error) {
//     console.error('Ошибка при проверке сообщения через API:', error);
//     return null; // Возвращаем null, если API недоступен или произошла ошибка
//   }
// }

// Функция для проверки сообщения с использованием триггерных слов
function checkSpamWithTriggers(text) {
  const messageText = text.toLowerCase();
  const triggerCount = triggers.reduce((count, trigger) => {
    return count + (messageText.includes(trigger) ? 1 : 0);
  }, 0);
  return triggerCount >= 2; // Сообщение считается спамом, если найдено 2 или более триггеров
}

// Функция для проверки наличия ссылок на Telegram группы
function containsTelegramGroupLink(text) {
  const telegramLinkRegex =
    /https?:\/\/(t\.me|telegram\.me)(\/joinchat\/\S+|\/\+?[A-Za-z0-9_\-]+)/i;
  return telegramLinkRegex.test(text);
}

// Функция для выдачи предупреждения и бана пользователя
async function handleUserWarning(ctx, userId, username) {
  const chatId = ctx.chat.id;

  // Инициализируем предупреждения для чата, если их еще нет
  if (!userWarnings[chatId]) {
    userWarnings[chatId] = {};
  }

  // Получаем текущее количество предупреждений для пользователя в этом чате
  const warnings = userWarnings[chatId][userId] || 0;

  if (warnings < 2) {
    // Если меньше 3 предупреждений, выдаем предупреждение
    userWarnings[chatId][userId] = warnings + 1;
    saveWarnings(userWarnings); // Сохраняем обновленные предупреждения
    await ctx.reply(
      `${username}, вы получили предупреждение за нарушение правил. У вас ${
        warnings + 1
      }/3 предупреждений. За 3 предупреждения вас забанят навсегда.`,
    );
  } else {
    // Если 3 предупреждения, баним пользователя навсегда
    try {
      await ctx.banChatMember(userId, { revoke_messages: true }); // Бан навсегда
      await ctx.reply(`${username} был забанен навсегда за 3 нарушения правил.`);
    } catch (error) {
      console.error('Ошибка при бане пользователя:', error);
      await ctx.reply(`Не удалось забанить пользователя ${username}. Проверьте права бота.`);
    }
    delete userWarnings[chatId][userId]; // Удаляем пользователя из списка предупреждений
    saveWarnings(userWarnings); // Сохраняем обновленные предупреждения
  }
}

// Функция для проверки, является ли пользователь администратором
async function isAdmin(ctx, userId) {
  try {
    const admins = await ctx.getChatAdministrators();
    return admins.some((admin) => admin.user.id === userId);
  } catch (error) {
    console.error('Ошибка при получении списка администраторов:', error);
    return false;
  }
}

export const handleMessage = (ctx) => {
  processSingleMessage(ctx, ctx.message);
};

// Обработка одного сообщения
const processSingleMessage = async (ctx, message) => {
  const messageText = message.text || '';
  const userId = message.from.id;
  const username = message.from.username ? `@${message.from.username}` : message.from.first_name;
  const chatId = ctx.chat.id;

  // Игнорируем сообщения от пользователей из списка exemptUsers и администраторов
  if (exemptUsers.includes(userId) || (await isAdmin(ctx, userId))) {
    return;
  }

  // Проверка на наличие ссылок на Telegram группы
  if (containsTelegramGroupLink(messageText)) {
    await ctx.deleteMessage(message.message_id).catch((err) => {
      console.error('Ошибка при удалении сообщения:', err);
    });
    await handleUserWarning(ctx, userId, username);
    return; // Прекращаем дальнейшую обработку сообщения
  }

  // Проверяем только сообщения длиннее 150 символов
  if (messageText.length > 100) {
    let isSpam = false;

    // Сначала проверяем через API спама
    // const apiResult = await checkSpamWithAPI(messageText);
    const apiResult = null;
    if (apiResult !== null) {
      isSpam = apiResult; // Используем результат API
    } else {
      // Если API недоступен, используем триггерные слова
      isSpam = checkSpamWithTriggers(messageText);
    }

    // Если сообщение считается спамом
    if (isSpam) {
      await ctx.deleteMessage(message.message_id).catch((err) => {
        console.error('Ошибка при удалении сообщения:', err);
      });
      await handleUserWarning(ctx, userId, username);
    }
  }

  // Проверка на длину сообщения (более 500 символов)
  if (messageText.length > 500) {
    await ctx.deleteMessage(message.message_id).catch((err) => {
      console.error('Ошибка при удалении сообщения (длина):', err);
    });
    // await ctx.reply(
    //   `${username}, пожалуйста, не отправляйте такие длинные сообщения, это запрещено правилами.`,
    // );
  }
};
