import { Telegraf } from 'telegraf';
import { handleMessage } from './src/messageHandler.js';
const { updateReputation, getReputationList } = await import('./src/reputationHandler.js');
import config from 'config';

const BOT_TOKEN = config.get('TELEGRAM_TOKEN');

const bot = new Telegraf(BOT_TOKEN);

bot.command('start', async (ctx) => {
  try {
    await ctx.reply('Жду вашего голосового или текстового сообщения');
  } catch (error) {
    console.error('Ошибка при выполнении команды /start:', error);
  }
});

// Приветствие новых участников
bot.on('new_chat_member', (ctx) => {
  try {
    const member = ctx.message.new_chat_member;
    ctx.reply(
      `Добро пожаловать в Трейдинг чат, ${
        member.first_name ? member.first_name : 'участник'
      }! Здесь мы обсуждаем финансовые инструменты, делимся своими идеями. Напишите /rules в чате, для того чтобы ознакомиться с правилами.`,
    );
  } catch (error) {
    console.error('Ошибка при отправке приветствия новому участнику:', error);
  }
});

// Отправка правил
bot.command('rules', (ctx) => {
  try {
    ctx.reply(
      `1. В нашем чате запрещены оскорбления участников. \n2. Рекламировать свои услуги. \n3. Навязывать свою точку зрения. \n4. Присылать длинные сообщения (больше 500 символов).`,
    );
  } catch (error) {
    console.error('Ошибка при отправке правил:', error);
  }
});

// Команда админа для проверки
bot.command('checkhistory', async (ctx) => {
  try {
    if (ctx.message.from.isAdministrator || ctx.message.from.isCreator) {
      await ctx.reply('Проверка последних сообщений, в рамках текущих API возможностей.');
      /* здесь можно реализовать метод, аналогичный предыдущим примерам */
    } else {
      await ctx.reply('У вас нет прав для этой команды.');
    }
  } catch (error) {
    console.error('Ошибка при выполнении команды /checkhistory:', error);
  }
});

// Отправка списка репутации
bot.command('rating', async (ctx) => {
  try {
    const reputationList = await getReputationList(ctx);
    ctx.reply(reputationList);
  } catch (error) {
    console.error('Ошибка при получении списка репутации:', error);
  }
});

// Обработка текстовых сообщений
bot.on('text', (ctx) => {
  try {
    handleMessage(ctx);
    updateReputation(ctx);
  } catch (error) {
    console.error('Ошибка при обработке текстового сообщения:', error);
  }
});

bot.action('rating', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const reputationList = await getReputationList(ctx);
    ctx.reply(reputationList);
  } catch (error) {
    console.error('Ошибка при обработке действия "rating":', error);
  }
});

bot.catch((error) => {
  console.error('Глобальная ошибка бота:', error);
  // Логирование или отправка уведомления разработчику
});

bot.launch();

console.log('Бот запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
