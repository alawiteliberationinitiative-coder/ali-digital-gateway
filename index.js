const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

const ACCESS_PASSWORD = "ALI_2024";

// دالة لإرسال القائمة بعد النجاح
const showSecretMenu = (chatId) => {
  bot.sendMessage(chatId, "✅ تم التحقق. إليك خيارات مشروع Bargylos:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📁 فتح أرشيف Bargylos', callback_data: 'view_files' }]
      ]
    }
  });
};

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '/start') {
    bot.sendMessage(chatId, "مرحباً بك في نظام ALI. يرجى إدخال كلمة المرور:");
  } 
  else if (text === ACCESS_PASSWORD) {
    showSecretMenu(chatId);
  }
  // خطة احتياطية: لو لم يعمل الزر، اكتب كلمة ملفات
  else if (text === "ملفات") {
    bot.sendMessage(chatId, "📂 (فتح يدوي) جاري تجهيز وثائق Bargylos...");
  }
});

// ميكانيكية التعامل مع الزر
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;

  if (query.data === 'view_files') {
    // إخبار تلغرام أننا استلمنا الضغطة (ضروري جداً)
    bot.answerCallbackQuery(query.id, { text: "جاري التحميل..." })
      .then(() => {
        bot.sendMessage(chatId, "📁 مرحباً بك في أرشيف Bargylos.\nالحالة: جاري ربط قاعدة البيانات التوثيقية.");
      })
      .catch((err) => {
        console.log("تأخير في استجابة الزر، لكننا سنحاول الإرسال على أي حال.");
        bot.sendMessage(chatId, "📁 (استجابة طوارئ) أرشيف Bargylos متاح الآن.");
      });
  }
});

console.log("النظام جاهز للاختبار يا سلمان 🚀");