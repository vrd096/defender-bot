import { Telegraf } from 'telegraf';
import { handleMessage } from './src/messageHandler.js';
const { updateReputation, getReputationList } = await import('./src/reputationHandler.js');
import 'dotenv/config';
import express from 'express';

// Инициализация Telegram бот
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_TOKEN не найден в переменных окружения.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function replyThenDelete(ctx, text, delayMs = 60000) {
  // 60000 мс = 1 минута
  try {
    const botMessage = await ctx.reply(text);
    setTimeout(async () => {
      try {
        await ctx.deleteMessage(botMessage.message_id);
      } catch (deleteError) {
        console.error('Ошибка при удалении сообщения бота:', deleteError);
        // Можно добавить логику, если сообщение уже удалено или нет прав
      }
    }, delayMs);
  } catch (replyError) {
    console.error('Ошибка при отправке сообщения бота:', replyError);
  }
}

// Обработчик команды /start
bot.command('start', async (ctx) => {
  try {
    await replyThenDelete(ctx, 'Бот работает');
  } catch (error) {
    console.error('Ошибка при выполнении команды /start:', error);
  }
});

// Приветствие новых участников
bot.on('new_chat_members', (ctx) => {
  try {
    console.log('Событие new_chat_members вызвано'); // Лог для диагност

    // Проверка, что событие содержит новых участников
    if (!ctx.message || !ctx.message.new_chat_members) {
      console.error('Нет данных о новых участниках:', ctx.message);
      return;
    }

    const botId = ctx.botInfo.id;

    const chatTitle = ctx.chat.title || 'группу'; // Название группы или "группу", если название отсутствует
    const members = ctx.message.new_chat_members; // Массив новых участников

    console.log(`Новые участники: ${members.length}`); // Лог количества новых участников

    members.forEach((member) => {
      // Проверяем, является ли новый участник самим ботом
      if (member.id === botId) {
        console.log('Бот присоединился к группе, приветствие не отправляется.');
        return;
      }

      const welcomeMessage = `Добро пожаловать в "${chatTitle}", ${
        member.first_name ? member.first_name : 'участник'
      }! Напишите /rules в чате, чтобы ознакомиться с правилами.`;

      console.log(`Отправка приветствия для ${member.first_name || 'участника'}`); // Лог перед отправкой

      ctx.reply(welcomeMessage).catch((error) => {
        console.error('Ошибка при отправке приветствия:', error);
      });
    });
  } catch (error) {
    console.error('Ошибка в обработчике new_chat_members:', error);
  }
});

bot.on('chat_member', (ctx) => {
  try {
    const chatMember = ctx.update.chat_member;

    // Проверяем, что пользователь стал участником группы
    if (chatMember.new_chat_member.status === 'member') {
      const member = chatMember.new_chat_member.user;
      const botId = ctx.botInfo.id;
      if (member.id === botId) {
        console.log('Бот присоединился к группе, приветствие не отправляется.');
        return;
      }

      const chatTitle = ctx.chat.title || 'группу';

      const welcomeMessage = `Добро пожаловать обратно в "${chatTitle}", ${
        member.first_name ? member.first_name : 'участник'
      }!`;

      ctx.reply(welcomeMessage).catch((error) => {
        console.error('Ошибка при отправке приветствия:', error);
      });
    }
  } catch (error) {
    console.error('Ошибка в обработчике chat_member:', error);
  }
});
// Отправка правил
bot.command('rules', async (ctx) => {
  try {
    await replyThenDelete(
      ctx,
      `1. В нашем чате запрещены оскорбления участников. \n2. Рекламировать свои услуги. \n3. Навязывать свою точку зрения. \n4. Присылать длинные сообщения (больше 500 символов). \n5. Запрещено отправлять ссылки. \n6. За неактивность 3 недель = участник удаляется.`,
    );
  } catch (error) {
    console.error('Ошибка при отправке правил:', error);
  }
});

// Команда админа для проверки
// bot.command('checkhistory', async (ctx) => {
//   try {
//     if (ctx.message.from.isAdministrator || ctx.message.from.isCreator) {
//       await ctx.reply('Проверка последних сообщений, в рамках текущих API возможностей.');
//       /* здесь можно реализовать метод, аналогичный предыдущим примерам */
//     } else {
//       await ctx.reply('У вас нет прав для этой команды.');
//     }
//   } catch (error) {
//     console.error('Ошибка при выполнении команды /checkhistory:', error);
//   }
// });

// Отправка списка репутации
bot.command('rating', async (ctx) => {
  try {
    const reputationList = await getReputationList(ctx);

    await replyThenDelete(ctx, reputationList);
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

// Обработка действия "rating"
bot.action('rating', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const reputationList = await getReputationList(ctx);
    ctx.reply(reputationList);
    await replyThenDelete(ctx, reputationList);
  } catch (error) {
    console.error('Ошибка при обработке действия "rating":', error);
  }
});

// Глобальный обработчик ошибок
bot.catch((error) => {
  console.error('Глобальная ошибка бота:', error);
  // Логирование или отправка уведомления разработчику
});

// Запуск бота
bot.launch();

console.log('Бот запущен');

// Добавление HTTP-сервера для Render
const app = express();

// Эндпоинт для проверки работы сервера
app.get('/ping', (req, res) => {
  console.log('Получен запрос на /ping');
  res.send('Pong!');
});

// Запуск сервера на порту, предоставленном Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HTTP-сервер запущен на порту ${PORT}`);
});

// Обработка сигналов завершения
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
