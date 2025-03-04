// reputationHandler.mjs
import fs from 'fs-extra';
import path from 'path';
import { Markup } from 'telegraf';

const filePath = path.join(process.cwd(), 'reputation.json');
const thanksTriggers = ['спасибо', '+', 'круто'];
const rankNames = [
  'Новичок',
  '🔵Ученик🔵',
  '🟢Профессионал🟢',
  '🟡Эксперт🟡',
  '🟠Мастер🟠',
  '🔴Специалист🔴',
];

// Загрузить репутацию из файла
const loadReputationData = async () => {
  try {
    const data = await fs.readJson(filePath);
    return data;
  } catch (err) {
    return {};
  }
};

// Сохранить репутацию в файл
const saveReputationData = async (data) => {
  try {
    await fs.writeJson(filePath, data);
  } catch (err) {
    console.error('Ошибка при сохранении данных', err);
  }
};

// Функция обновления репутации
export const updateReputation = async (ctx) => {
  const messageText = ctx.message.text.toLowerCase();
  const replyTo = ctx.message.reply_to_message;
  if (!replyTo) return;
  const authorId = replyTo.from.id;
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  if (authorId === userId) return;
  const currentTime = Date.now();
  const data = await loadReputationData();
  if (!data[chatId]) {
    data[chatId] = {};
  }
  if (!data[chatId][authorId]) {
    data[chatId][authorId] = { points: 0, lastUpdated: {} };
  }
  const lastUpdate = data[chatId][authorId].lastUpdated[userId] || 0;
  const oneHour = 3600000;
  if (
    thanksTriggers.some((trigger) => messageText.includes(trigger)) &&
    currentTime - lastUpdate > oneHour
  ) {
    data[chatId][authorId].points++;
    data[chatId][authorId].lastUpdated[userId] = currentTime;
    await saveReputationData(data);
    const rank = getRank(data[chatId][authorId].points);
    const giverName = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, authorId);
    const username = chatMember.user.username
      ? `@${chatMember.user.username}`
      : chatMember.user.first_name;
    await ctx.replyWithHTML(
      `${username}, вашу репутацию увеличил ${giverName}. 🏆 Ваша репутация ${data[chatId][authorId].points}.`,
      Markup.inlineKeyboard([Markup.button.callback('Рейтинг чата', 'rating')]),
    );
  }
};

// Получение списка репутации
export const getReputationList = async (ctx) => {
  const chatId = ctx.chat.id;
  const data = await loadReputationData();
  if (!data[chatId]) {
    return 'Никто еще не получил баллы в этой группе.';
  }
  // Получение первых 20 участников с самой высокой репутацией
  const topUsers = Object.entries(data[chatId])
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 20); // Берем только первые 20 элементов
  if (topUsers.length === 0) {
    return 'Никто еще не получил баллы.';
  }
  const promises = topUsers.map(async ([id, info]) => {
    try {
      const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, id);
      const username = chatMember.user.username
        ? `@${chatMember.user.username}`
        : chatMember.user.first_name;
      const rank = getRank(info.points);
      return `${username}, Баллы: ${info.points}, Звание: ${rank}`;
    } catch (error) {
      console.error(`Не удалось получить данные участника для ${id}:`, error);
      return `ID: ${id}, Баллы: ${info.points}, Звание: неизвестно (ошибка доступа)`;
    }
  });
  const list = await Promise.all(promises);
  return list.join('\n');
};

// Получение звания
const getRank = (points) => {
  if (points >= 5000) return rankNames[5];
  if (points >= 1000) return rankNames[4];
  if (points >= 500) return rankNames[3];
  if (points >= 100) return rankNames[2];
  if (points >= 10) return rankNames[1];
  return rankNames[0];
};
