import { Client } from 'pg'

import Express, { Request, Response, NextFunction } from 'express'
import { validateEventPostingFilterDates, validateWayBillId } from './helpers'
import morgan from 'morgan'

const app = Express()
const PORT = 8000

// note: not the best practice to hardcode DB creds into the source file
const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'candidate',
    password: 'password123',
    database: 'takehome'
})

app.use(morgan('combined'))

// catch all incase of uncaught error (better than just disconnecting)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('ERROR', err.stack)
    res.status(500).send('Something broke!')
})

app.get('/equipment', async (req, res) => {
    const { rows } = await client.query(`SELECT * from equipment;`)

    res.send(rows)
})

app.get('/events', validateEventPostingFilterDates, async (req, res) => {

    const { start_posting_date, end_posting_date } = req.query

    let condition = ''
    let values: any[] = []
    if (start_posting_date) {
        condition = 'WHERE posting_date > $1 '
        values.push(start_posting_date)
    }
    if (end_posting_date) {
        values.push(end_posting_date)
        if (condition) {
            condition += `AND posting_date < $${values.length}`
        } else {
            condition = 'WHERE posting_date < $1'
        }
    }

    const { rows } = await client.query(`SELECT * from events ${condition}`, values)

    res.send(rows)
})

app.get('/locations', async (req, res) => {
    const { rows } = await client.query(`SELECT * from locations`)

    res.send(rows)
})

app.get('/waybills', async (req, res) => {
    const { rows } = await client.query(`SELECT * from waybills`)

    res.send(rows)
})

app.get('/waybills/:id', validateWayBillId, async (req: Request, res: Response) => {
    const { rows } = await client.query(`SELECT * from waybills WHERE id = $1 LIMIT 1`, [req.params.id])
    if (rows.length !== 1) {
        res.statusCode = 404
        res.send({ error: 'waybill not found' })
        return
    }

    res.send(rows[0])
})

app.get('/waybills/:id/equipment', validateWayBillId, async (req, res) => {
    const { rows } = await client.query(`
        SELECT * from equipment 
            WHERE equipment_id IN
             (SELECT equipment_id from waybills WHERE id = $1 LIMIT 1)
    `, [req.params.id])

    res.send(rows)
})

app.get('/waybills/:id/events', [validateWayBillId, validateEventPostingFilterDates], async (req: Request, res: Response) => {
    const { start_posting_date, end_posting_date } = req.query

    let condition = 'WHERE waybill_id = $1 '
    let values: any[] = [req.params.id]

    if (start_posting_date) {
        values.push(start_posting_date)
        condition += ` AND posting_date > $${values.length} `
    }
    if (end_posting_date) {
        values.push(end_posting_date)
        condition += ` AND posting_date < $${values.length} `
    }
    const { rows } = await client.query(`SELECT * from events ${condition}`, values)
    res.send(rows)
})

// note: assuming 'locations about the given waybill' referrs to the origin + destination
app.get('/waybills/:id/locations', validateWayBillId, async (req, res) => {
    const { rows } = await client.query(`SELECT * from waybills WHERE id = $1 LIMIT 1`, [req.params.id])
    if (rows.length !== 1) {
        return res.send([])
    }

    // TODO: improvement, properly ID which location is the origin + destionation?
    const { origin_id, destination_id } = rows[0]
    const locationResult = await client.query(`
    SELECT * from locations
        WHERE id = $1 OR id = $2
    `, [origin_id, destination_id])

    res.send(locationResult.rows)
})

app.get('/health/ping', (req, res) => {
    res.send({ "ping": "true" })
})

async function init() {
    await client.connect()
    const server = app.listen(PORT, () => { console.log(`server listening on ${PORT}`) })

    process.on('exit', async function () {
        // stop accepting new connections
        server.close()
        // close client cleanly so that the db doesnt have a bunch of dangling connections
        await client.end()
    })
}

init()

