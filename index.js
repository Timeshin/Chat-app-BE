const express = require('express')
const { Server } = require('socket.io')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')

const PORT = process.env.PORT || 8080

const app = express()
app.use(express.json())
app.use(cors())

const server = require('http').Server(app)

let messages = []
let names = []

const io = new Server(server, {
  path: '/websockets',
  cors: {
    origin: '*',
  },
})

app.get('/names', (req, res) => {
  const { query } = req

  if(names.some(name => name === query.name)) {
    res.json(true)
  } else {
    res.json(false)
  }
})

io.on('connection', socket => {
  const user = {
    type: 'action',
    message: {
      text: `${socket.handshake.query.userName} joined`,
      userName: socket.handshake.query.userName,
    },
    id: uuidv4()
  }

  names = [...new Set([...names, socket.handshake.query.userName])]

  messages = [...messages, user]
  
  socket.broadcast.emit('message:get', user)

  socket.emit('message:get', messages)


  socket.on('message:send', (message) => {
    const messageData = {
      type: 'message',
      message: {
        text: message.message,
        userName: message.userName,
      },
      id: uuidv4()
    }

    messages = [...messages, messageData]

    io.emit('message:get', { ...messageData })
  })
  
  socket.on('disconnect', () => {
    const message = {
      type: 'action',
      message: {
        text: `${socket.handshake.query.userName} left`,
        userName: socket.handshake.query.userName
      },
      id: uuidv4(),
    }

    messages = [...messages, message]
    names = names.filter(name => name !== socket.handshake.query.userName)
    
    io.emit('message:get', message)
  })
})


server.listen(PORT, () => console.log(`server started on port ${PORT}`))
