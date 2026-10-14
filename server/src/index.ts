import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { errorHandler, notFound } from './middleware/errorHandler'

import healthRouter from './routes/health'
import authRouter from './routes/auth'
import doctorsRouter from './routes/doctors'
import productsRouter from './routes/products'
import battlecardsRouter from './routes/battlecards'
import practiceRouter from './routes/practice'
import postcallRouter from './routes/postcall'
import realtimeRouter from './routes/realtime'
import timelineRouter from './routes/timeline'
import notesRouter from './routes/notes'
import callpracticeRouter from './routes/callpractice'
import livecallRouter from './routes/livecall'
import visitPrepRouter from './routes/visitPrep'
import followUpsRouter from './routes/followUps'
import salesRepsRouter from './routes/salesreps'
import assignmentsRouter from './routes/assignments'
import managerRouter from './routes/manager'
import visitsRouter from './routes/visits'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(
  cors({
    origin: process.env.APP_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/doctors', doctorsRouter)
app.use('/api/products', productsRouter)
app.use('/api/battlecards', battlecardsRouter)
app.use('/api/practice', practiceRouter)
app.use('/api/postcall', postcallRouter)
app.use('/api/realtime', realtimeRouter)
app.use('/api/doctors', timelineRouter)
app.use('/api/doctors', notesRouter)
app.use('/api/callpractice', callpracticeRouter)
app.use('/api/livecall', livecallRouter)
app.use('/api/doctors', visitPrepRouter)
app.use('/api/follow-ups', followUpsRouter)
app.use('/api/salesreps', salesRepsRouter)
app.use('/api/manager', managerRouter)
app.use('/api/assignments', assignmentsRouter)
app.use('/api/visits', visitsRouter)

app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 Ekfrazo server running on http://localhost:${PORT}`)
})

export default app
