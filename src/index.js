const { Telegraf, session, Scenes: {WizardScene, BaseScene, Stage}, Markup } = require('telegraf')
const userModel = require('./models/user.model')
const noteModel = require('./models/note.model')
const e = require('express')
require('dotenv').config()

const token = process.env.TELEGRAM_TOKEN

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

  await ctx.reply('Type note text please.')

  return ctx.wizard.next()
})

const textHandler = Telegraf.on('text', async ctx => {
  const name = ctx.scene.state.name
  const text = ctx.message.text
  const user_id = ctx.message.from.id

  try {
    await noteModel.create({user_id, name, text})
    await ctx.reply('New note has been set!')
  } catch (error) {
    ctx.reply('Erro while creating note.')
  }

  return ctx.scene.leave()
})

const noteScene = new BaseScene('noteScene')
noteScene.enter( async ctx => {
  const user_id = ctx.scene.state.user_id
  try {
    const result = await noteModel.find({user_id})
    result.forEach((element) => ctx.reply(`📒 ${element.name}\n\n 📎 ${element.text}`, note_keyboard(element.id)))
  } catch (error) {
    ctx.reply('Error while getting notes')
  }
})
noteScene.action(/^edit:[0-9]+$/, ctx => {
  const id = ctx.callbackQuery.data.split(':')[1]
  ctx.answerCbQuery('Note edit!')
})
noteScene.action(/^done:[0-9]+$/, ctx => {
  const id = ctx.callbackQuery.data.split(':')[1]
  ctx.answerCbQuery('Note done!')
})
noteScene.action(/^remove:[0-9]+$/, ctx => {

  const id = ctx.callbackQuery.data.split(':')[1]

  return ctx.editMessageText('Are you sure you want to delete this note?', confirm_removal_note_keyboard(id))
})

noteScene.action(/^cancel:[0-9]+$/, async ctx => {

  const id = ctx.callbackQuery.data.split(':')[1]

  try {
    const result = await noteModel.findOne({id})
    return ctx.editMessageText(`📒 Note name:${result.name}\n\n 📎 Note text:\n${result.text}`, note_keyboard(id))
  } catch (error) {
    return ctx.reply('Error cancel')
  }
})

noteScene.action(/^yes:[0-9]+$/, async ctx => {
  const id = ctx.callbackQuery.data.split(':')[1]

  try {
    const result = await noteModel.delete(id)
    if (result) return ctx.editMessageText('Note deleted', id)
  } catch (error) {
    return ctx.reply('Error delete')
  }
})
noteScene.leave()

const addNoteStage = new WizardScene('addNoteStage', nameHandler, textHandler)
addNoteStage.enter(ctx => ctx.reply('Alright, a new note. How are we going to call it?'))

const stage = new Stage([ noteScene, addNoteStage ])
stage.hears('exit', ctx => ctx.scene.leave())

const bot = new Telegraf(token)
bot.use(
  session({
    property: 'chatSession',
    getSessionKey: (ctx) => ctx.chat && ctx.chat.id,
  })
)
bot.use(stage.middleware())

bot.command('/start', async ctx => {
  const telegram_id = ctx.message.from.id

  try {
    await userModel.create({telegram_id})
  } catch (error) {
    console.error('User already exist');
  }

  ctx.reply('Start')
  return ctx.scene.leave()
})

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
