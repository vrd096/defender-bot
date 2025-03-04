// Список пользователей, у которых нарушения игнорируются (например, владельцы группы или специальные пользователи)
const exemptUsers = [178999805]; // Замените эти числа на реальные ID пользователей

export const handleMessage = (ctx) => {
  processSingleMessage(ctx, ctx.message);
};

// Обработка одного сообщения
const processSingleMessage = async (ctx, message) => {
  const messageText = message.text?.toLowerCase() || '';
  const userId = message.from.id;

  // Игнорируем сообщения от пользователей из списка exemptUsers
  if (exemptUsers.includes(userId)) {
    return;
  }

  // Заданные триггерные слова
  const triggers = ['курсы', 'видеоуроки', 'обучение', 'поделюсь', 'готов поделиться'];

  // Подсчет количества обнаруженных триггерных слов в сообщении
  const triggerCount = triggers.reduce((count, trigger) => {
    return count + (messageText.includes(trigger) ? 1 : 0);
  }, 0);

  // Проверка на длину сообщения
  if (messageText.length > 500) {
    await ctx
      .deleteMessage(message.message_id)
      .catch((err) => console.error('Ошибка при удалении сообщения (длина):', err));
    const username = message.from.username ? `@${message.from.username}` : message.from.first_name;
    ctx.reply(
      `${username}, пожалуйста, не отправляйте такие длинные сообщения, это запрещено правилами.`,
    );
    return;
  }

  // Проверка на все возможные URL ссылки и Telegram-ссылки
  const urlPattern = /https?:\/\/[^\s]+|t\.me\/[^\s]+|telegram\.me\/[^\s]+|@[\w_]+/i;

  // Проверка условий - если обнаружено хотя бы два триггера в сообщении или общие/телеграмм-ссылки
  if (triggerCount >= 2 || urlPattern.test(messageText)) {
    await ctx
      .deleteMessage(message.message_id)
      .catch((err) => console.error('Ошибка при удалении сообщения (ссылки):', err));
    const username = message.from.username ? `@${message.from.username}` : message.from.first_name;
    ctx.reply(
      `${username}, пожалуйста, воздержитесь от публикации сообщений, содержащих запрещенные слова, ссылки или упоминания других групп и каналов Telegram.`,
    );
  }
};
