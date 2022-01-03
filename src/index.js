const { Telegraf, session, Scenes: {WizardScene, BaseScene, Stage}, Markup } = require('telegraf')
const userModel = require('./models/user.model')
const noteModel = require('./models/note.model')
const homeTaskModel = require('./models/hometask.model')
const Calendar = require('telegraf-calendar-telegram')
require('dotenv').config()

const CryptoJS = require("crypto-js");

const DONE_STATUS = 20;
const ACTIVE_STATUS = 10;
const DELETED_STATUS = 0;

const token = process.env.TELEGRAM_TOKEN

const exit_keyboard = Markup.keyboard([ 'exit' ]).oneTime()
const remove_keyboard = Markup.removeKeyboard()

const note_keyboard = (note_id) => Markup.inlineKeyboard([
  Markup.button.callback('✅', `done:${note_id}`),
  Markup.button.callback('✏️ Edit', `edit:${note_id}`),
  Markup.button.callback('🗑 Remove', `remove:${note_id}`)
])

const confirm_removal_note_keyboard = (note_id) => Markup.inlineKeyboard([
  Markup.button.callback('✅ Yes', `yes:${note_id}`),
  Markup.button.callback('🚫 Cancel', `cancel:${note_id}`)
])

const nameHandler = Telegraf.on('text', async ctx => {

  ctx.scene.state.name = ctx.message.text

  await ctx.replyWithMarkdown('\*Type note text please\*', exit_keyboard)

  return ctx.wizard.next()
})

const textHandler = Telegraf.on('text', async ctx => {
  ctx.scene.state.text = ctx.message.text

  const today = new Date();
	const minDate = new Date();
	minDate.setMonth(today.getMonth() - 2);
	const maxDate = new Date();
	maxDate.setMonth(today.getMonth() + 2);
	maxDate.setDate(today.getDate());

  await ctx.replyWithMarkdown('<b>Select month and date please</b>', calendar.setMinDate(minDate).setMaxDate(maxDate).getCalendar())

  return ctx.wizard.next()
})

const timeHandler = Telegraf.on('text', async ctx => {
  const user_id = ctx.message.from.id
  const name = CryptoJS.AES.encrypt(ctx.scene.state.name, process.env.SECRET_KEY).toString();
  const text = CryptoJS.AES.encrypt(ctx.scene.state.text, process.env.SECRET_KEY).toString();
  const date = ctx.scene.state.date
  const time = ctx.message.text

  let deadline_at = Math.floor(new Date(`${date} ${time} +0000 GMT +0200`) / 1000)

  try {
    await noteModel.create({user_id, name, text, deadline_at})
    await ctx.replyWithMarkdown('\*New note has been set!\*', remove_keyboard)
  } catch (error) {
    ctx.reply('Error while create note.', remove_keyboard)
  }

  return ctx.scene.leave()
})

const nameHomeTaskHandler = Telegraf.on('text', async ctx => {

  ctx.scene.state.name = ctx.message.text

  await ctx.replyWithMarkdown('\*Type hometask text please\*', exit_keyboard)

  return ctx.wizard.next()
})

const textHomeTaskHandler = Telegraf.on('text', async ctx => {
  ctx.scene.state.text = ctx.message.text

  const today = new Date();
	const minDate = new Date();
	minDate.setMonth(today.getMonth() - 2);
	const maxDate = new Date();
	maxDate.setMonth(today.getMonth() + 2);
	maxDate.setDate(today.getDate());

  await ctx.replyWithMarkdown('<b>Select month and date please</b>', calendar.setMinDate(minDate).setMaxDate(maxDate).getCalendar())

  return ctx.wizard.next()
})

const timeHomeTaskHandler = Telegraf.on('text', async ctx => {
  const user_id = ctx.message.from.id
  const name = CryptoJS.AES.encrypt(ctx.scene.state.name, process.env.SECRET_KEY).toString();
  const text = CryptoJS.AES.encrypt(ctx.scene.state.text, process.env.SECRET_KEY).toString();
  const date = ctx.scene.state.date
  const time = ctx.message.text

  let deadline_at = Math.floor(new Date(`${date} ${time} +0000 GMT +0200`) / 1000)

  try {
    const result = await homeTaskModel.create({user_id, name, text, deadline_at})
    await ctx.replyWithMarkdown('\*New hometask has been set!\*', remove_keyboard)

    sendPushNotification(result.insertId)
  } catch (error) {
    ctx.reply('Error while create hometask.', remove_keyboard)
  }

  return ctx.scene.leave()
})

const sendPushNotification = async (id) => {
  try {
    const new_homeTask = await homeTaskModel.findOne({id})
    let name = CryptoJS.AES.decrypt(new_homeTask.name, process.env.SECRET_KEY).toString(CryptoJS.enc.Utf8);
    let text = CryptoJS.AES.decrypt(new_homeTask.text, process.env.SECRET_KEY).toString(CryptoJS.enc.Utf8);
    let date = await convertMS(new_homeTask.deadline_at*1000)

    let message = `🔥 \*Added new homework\*\n\n 📒 \*${name}\*\n\n 📎 \_${text}\_\n\n 💣 \*Time left: ${date.day} ${date.hour} ${date.minute} ${date.seconds}\*`

    const result = await userModel.find()
    result.forEach( async (element) => {
      try{
        await bot.telegram.sendMessage(element.telegram_id, message, { parse_mode: 'Markdown' })
      } catch (error) {
        console.log(error)
      }
    })
  } catch (error) {
    console.log('Error while sending push message')
  }
}

const convertMS = async (deadline) => {
  let date = Date.now();
  
  let milliseconds = deadline - date;
  
  if (milliseconds < 0) return false;

  let day, hour, minute, seconds, inTime;
  seconds = Math.floor(milliseconds / 1000);
  minute = Math.floor(seconds / 60);
  seconds = seconds % 60;
  hour = Math.floor(minute / 60);
  minute = minute % 60;
  day = Math.floor(hour / 24);
  hour = hour % 24;

  if (day >= 5) {
    return {
      day: `${day} days`,
      hour: '',
      minute: '',
      seconds: ''
    }
  }

  if (day <= 5 && day >= 1) {
    return {
      day: `${day} days`,
      hour: `${hour} hours`,
      minute: '',
      seconds: ''
    }
  }

  if (day <= 1 && hour >= 1) {
    return {
      day: '',
      hour: `${hour} hours`,
      minute: minute == 0 ? '' : `${minute} minutes`,
      seconds: ''
    }
  }

  if (hour <= 1) {
    return {
      day: '',
      hour: '',
      minute: minute == 0 ? '' : `${minute} minutes`,
      seconds: seconds == 0 ? '' :  `${seconds} seconds`
    }
  }
}

const noteScene = new BaseScene('noteScene')
noteScene.enter( async ctx => {
  const user_id = ctx.scene.state.user_id
  try {
    const result = await noteModel.find(user_id, ACTIVE_STATUS)
    result.forEach(async (element) => {
      let name = CryptoJS.AES.decrypt(element.name, process.env.SECRET_KEY).toString(CryptoJS.enc.Utf8);
      let text = CryptoJS.AES.decrypt(element.text, process.env.SECRET_KEY).toString(CryptoJS.enc.Utf8);
      let date = await convertMS(element.deadline_at*1000)
      await ctx.replyWithMarkdown(`📒 \*${name}\*\n\n 📎 \_${text}\_\n\n 💣 \*Time left: ${date.day} ${date.hour} ${date.minute} ${date.seconds}\*`, note_keyboard(element.id))
    })
  } catch (error) {
    ctx.reply('Error while get notes')
  }
})
noteScene.action(/^edit:[0-9]+$/, ctx => {
  const id = ctx.callbackQuery.data.split(':')[1]
  ctx.answerCbQuery('Note edit!')
})
noteScene.action(/^done:[0-9]+$/, async ctx => {
  const id = ctx.callbackQuery.data.split(':')[1]

  try {
    const result = await noteModel.update({status: DONE_STATUS}, id)
    if (result) return ctx.editMessageText('✅ Note done', id)
  } catch (error) {
    return ctx.reply('Error cancel')
  }
})
noteScene.action(/^remove:[0-9]+$/, ctx => {

  const id = ctx.callbackQuery.data.split(':')[1]

  return ctx.editMessageText('Are you sure you want to delete this note?', confirm_removal_note_keyboard(id))
})

noteScene.action(/^cancel:[0-9]+$/, async ctx => {

  const id = ctx.callbackQuery.data.split(':')[1]

  try {
    const result = await noteModel.findOne({id})
    let name = CryptoJS.AES.decrypt(result.name, process.env.SECRET_KEY).toString(CryptoJS.enc.Utf8);
    let text = CryptoJS.AES.decrypt(result.text, process.env.SECRET_KEY).toString(CryptoJS.enc.Utf8);
    let date = await convertMS(result.deadline_at*1000)
    return ctx.editMessageText(`📒 ${name}\n\n 📎 ${text}\n\n 💣 Time left: ${date.day} ${date.hour} ${date.minute} ${date.seconds}`, note_keyboard(id))
  } catch (error) {
    return ctx.reply('Error cancel')
  }
})

noteScene.action(/^yes:[0-9]+$/, async ctx => {
  const id = ctx.callbackQuery.data.split(':')[1]

  try {
    const result = await noteModel.update({status: DELETED_STATUS}, id)
    if (result) return ctx.editMessageText('🗑 Note deleted', id)
  } catch (error) {
    return ctx.reply('Error delete')
  }
})
noteScene.leave()

const homeTask = new BaseScene('homeTask')
homeTask.enter( async ctx => {
  console.log('Get home task -> username: ' + ctx.message.from.username + ', ' + ctx.message.from.first_name);

  try {
    const result = await homeTaskModel.find(ACTIVE_STATUS)
    result.forEach(async (element) => {
      let name = CryptoJS.AES.decrypt(element.name, process.env.SECRET_KEY).toString(CryptoJS.enc.Utf8);
      let text = CryptoJS.AES.decrypt(element.text, process.env.SECRET_KEY).toString(CryptoJS.enc.Utf8);
      let date = await convertMS(element.deadline_at*1000)

      if (date) {
        await ctx.replyWithMarkdown(`📒 \*${name}\*\n\n 📎 \_${text}\_\n\n 💣 \*Time left: ${date.day} ${date.hour} ${date.minute} ${date.seconds}\*`)
      } else {
        await ctx.replyWithMarkdown(`📕 \*${name}\*\n\n 📎 \_${text}\_\n\n ❌ Home task is missing!`)
      }
    })
  } catch (error) {
    ctx.reply('Error while get hometask')
  }
})
homeTask.leave()

const addHomeTaskStage = new WizardScene('addHomeTaskStage', nameHomeTaskHandler, textHomeTaskHandler, timeHomeTaskHandler)
addHomeTaskStage.enter(ctx => ctx.replyWithMarkdown('\*Alright, a new hometask. How are we going to call it?\*', exit_keyboard))

const addNoteStage = new WizardScene('addNoteStage', nameHandler, textHandler, timeHandler)
addNoteStage.enter(ctx => ctx.replyWithMarkdown('\*Alright, a new note. How are we going to call it?\*', exit_keyboard))

const stage = new Stage([ noteScene, addNoteStage, homeTask, addHomeTaskStage ])
stage.hears('exit', ctx => ctx.scene.leave())

const bot = new Telegraf(token)
bot.use(
  session({
    property: 'chatSession',
    getSessionKey: (ctx) => ctx.chat && ctx.chat.id,
  })
)
bot.use(stage.middleware())

// instantiate the calendar
const calendar = new Calendar(bot, {
  startWeekDay: 0,
  weekDayNames: ["S", "M", "T", "W", "T", "F", "S"],
  monthNames: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ],
  minDate: null,
  maxDate: null
})

// listen for the selected date event
calendar.setDateListener((ctx, date) => {
  ctx.scene.state.date = date

  ctx.replyWithMarkdown('\*Type deadline time please\*', exit_keyboard)
});

bot.command('/start', async ctx => {
  const telegram_id = ctx.message.from.id

  try {
    await userModel.create({telegram_id})
  } catch (error) {
    console.error('User already exist');
  }

  ctx.reply('Hi 👻')
  return ctx.scene.leave()
})

bot.command('/gethometask', ctx => ctx.scene.enter('homeTask'))

bot.command('/addhometask', ctx => ctx.scene.enter('addHomeTaskStage'))

bot.command('/addnote', ctx => ctx.scene.enter('addNoteStage'))

bot.command('/getnotes', ctx => ctx.scene.enter('noteScene', {user_id: ctx.message.from.id}))

// Start webhook via launch method (preferred)
bot.launch({
  webhook: {
    domain: process.env.SERVER_URL,
    port: process.env.PORT
  }
})

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
