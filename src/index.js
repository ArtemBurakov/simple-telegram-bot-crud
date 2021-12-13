const { Telegraf, session, Scenes: {WizardScene, BaseScene, Stage}, Markup } = require('telegraf')
const userModel = require('./models/user.model')
const noteModel = require('./models/note.model')
const Calendar = require('telegraf-calendar-telegram');
require('dotenv').config()

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
  const name = ctx.scene.state.name
  const text = ctx.scene.state.text
  const date = ctx.scene.state.date
  const time = ctx.message.text

  let deadline_at = Math.floor(new Date(`${date} ${time} +0000 GMT +0200`) / 1000)

  try {
    const result = await noteModel.create({user_id, name, text, deadline_at})
    await ctx.replyWithMarkdown('\*New note has been set!\*', remove_keyboard)

    if (user_id == 847840905 || user_id == 655224768) {
      sendPushNotification(result.insertId)
    }
  } catch (error) {
    ctx.reply('Error while create note.', remove_keyboard)
  }

  return ctx.scene.leave()
})

const sendPushNotification = async (id) => {
  try {
    const new_note = await noteModel.findOne({id})
    let date = new Date(new_note.deadline_at*1000)

    let message = `🔥 \*Added new homework\*\n\n 📒 \*${new_note.name}\*\n\n 📎 \_${new_note.text}\_\n\n ⏱ \*${date.toLocaleDateString('en-US', {weekday: 'long'})} ${date.toLocaleDateString('en-US', {day: "numeric"})}/${date.getMonth()+1}/${date.getFullYear()} ${date.getHours()}:${('0'+date.getMinutes()).slice(-2)}\*`

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

const noteScene = new BaseScene('noteScene')
noteScene.enter( async ctx => {
  const user_id = ctx.scene.state.user_id
  try {
    const result = await noteModel.find(user_id, ACTIVE_STATUS)
    result.forEach((element) => {
      let date = new Date(element.deadline_at*1000);
      ctx.replyWithMarkdown(`📒 \*${element.name}\*\n\n 📎 \_${element.text}\_\n\n ⏱ \*${date.toLocaleDateString('en-US', {weekday: 'long'})} ${date.toLocaleDateString('en-US', {day: "numeric"})}/${date.getMonth()+1}/${date.getFullYear()} ${date.getHours()}:${('0'+date.getMinutes()).slice(-2)}\*`, note_keyboard(element.id))
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
    let date = new Date(result.created_at*1000);
    return ctx.editMessageText(`📒 ${result.name}\n\n 📎 ${result.text}\n\n ⏱ ${date.toLocaleDateString('en-US', {weekday: 'long'})} ${date.toLocaleDateString('en-US', {day: "numeric"})}/${date.getMonth()+1}/${date.getFullYear()} ${date.getHours()}:${('0'+date.getMinutes()).slice(-2)}`, note_keyboard(id))
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
  console.log('Get home task -> ' + ctx.message.from.id);

  const user_id = 847840905
  try {
    const result = await noteModel.find(user_id, ACTIVE_STATUS)
    result.forEach((element) => {
      let date = new Date(element.deadline_at*1000);
      ctx.replyWithMarkdown(`📒 \*${element.name}\*\n\n 📎 \_${element.text}\_\n\n ⏱ \*${date.toLocaleDateString('en-US', {weekday: 'long'})} ${date.toLocaleDateString('en-US', {day: "numeric"})}/${date.getMonth()+1}/${date.getFullYear()} ${date.getHours()}:${('0'+date.getMinutes()).slice(-2)}\*`)
    })
  } catch (error) {
    ctx.reply('Error while get notes')
  }
})
homeTask.leave()

const addNoteStage = new WizardScene('addNoteStage', nameHandler, textHandler, timeHandler)
addNoteStage.enter(ctx => ctx.replyWithMarkdown('\*Alright, a new note. How are we going to call it?\*', exit_keyboard))

const stage = new Stage([ noteScene, addNoteStage, homeTask ])
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
