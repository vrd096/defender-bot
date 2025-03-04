import { Client } from '@gradio/client';

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
];

// Функция для проверки сообщения через API спама
async function checkSpamWithAPI(text) {
  try {
    const client = await Client.connect('Subhajit01/spam_detection_poweredby_custom_GPT');
    const result = await client.predict('/classify', {
      text: text,
    });

    // Логируем ответ API для отладки
    // console.log('API Response:', result);

    // Обрабатываем ответ API
    if (result.data && Array.isArray(result.data) && result.data[0]) {
      const label = result.data[0].toLowerCase(); // Получаем первый элемент массива и приводим к нижнему регистру
      return label === 'spam'; // Возвращаем true, если метка "spam"
    }

    // Если формат ответа неожиданный, возвращаем null
    console.error('Неожиданный формат ответа API:', result);
    return null;
  } catch (error) {
    console.error('Ошибка при проверке сообщения через API:', error);
    return null; // Возвращаем null, если API недоступен или произошла ошибка
  }
}

// Функция для проверки сообщения с использованием триггерных слов
function checkSpamWithTriggers(text) {
  const messageText = text.toLowerCase();
  const triggerCount = triggers.reduce((count, trigger) => {
    return count + (messageText.includes(trigger) ? 1 : 0);
  }, 0);
  return triggerCount >= 2; // Сообщение считается спамом, если найдено 2 или более триггеров
}

export const handleMessage = (ctx) => {
  processSingleMessage(ctx, ctx.message);
};

// Обработка одного сообщения
const processSingleMessage = async (ctx, message) => {
  const messageText = message.text || '';
  const userId = message.from.id;

  // Игнорируем сообщения от пользователей из списка exemptUsers
  if (exemptUsers.includes(userId)) {
    return;
  }

  // Проверяем только сообщения длиннее 150 символов
  if (messageText.length > 150) {
    let isSpam = false;

    // Сначала проверяем через API спама
    const apiResult = await checkSpamWithAPI(messageText);
    if (apiResult !== null) {
      isSpam = apiResult; // Используем результат API
    } else {
      // Если API недоступен, используем триггерные слова
      isSpam = checkSpamWithTriggers(messageText);
    }

    // Если сообщение считается спамом
    if (isSpam) {
      await ctx
        .deleteMessage(message.message_id)
        .catch((err) => console.error('Ошибка при удалении сообщения:', err));
      const username = message.from.username
        ? `@${message.from.username}`
        : message.from.first_name;
      ctx.reply(`${username}, пожалуйста, воздержитесь от публикации рекламы.`);
    }
  }

  // Проверка на длину сообщения (более 500 символов)
  if (messageText.length > 500) {
    await ctx
      .deleteMessage(message.message_id)
      .catch((err) => console.error('Ошибка при удалении сообщения (длина):', err));
    const username = message.from.username ? `@${message.from.username}` : message.from.first_name;
    ctx.reply(
      `${username}, пожалуйста, не отправляйте такие длинные сообщения, это запрещено правилами.`,
    );
  }
};
