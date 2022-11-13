import { parse } from 'csv-parse/sync'
import { Request, Response, NextFunction } from 'express'
import { Client } from 'pg'
import { promises as fs } from 'fs'

/**
 * express middleware to validate Waybill id url parameter
 * @param req 
 * @param res 
 * @param next 
 * @returns 
 */
export function validateWayBillId(req: Request, res: Response, next: NextFunction) {
    // todo valdidate too large/small int
    if (isNaN(parseInt(req.params.id))) {
        res.statusCode = 400
        res.send({ error: 'invalid id, must be an int' })
        return
    }
    next()
}

/**
 * express middleware to validate the start/end posting_date filter query params for event endpoints
 * @param req 
 * @param res 
 * @param next 
 * @returns 
 */
export function validateEventPostingFilterDates(req: Request, res: Response, next: NextFunction) {
    // note: this Date validate function is not optimal but I feel that it is good enough for a 4h take home
    if (req.query.start_posting_date && isNaN(Date.parse(req.query.start_posting_date as string))) {
        res.statusCode = 400
        res.send({ error: 'invalid start_posting_date' })
        return
    } else if (req.query.end_posting_date && isNaN(Date.parse(req.query.end_posting_date as string))) {
        res.statusCode = 400
        res.send({ error: 'invalid end_posting_date' })
        return
    }
    next()
}

// generate the values part of the insert query for a given array length (ie $1, $2, .....)
function genValuesString(length: number): string {
    return Array(length).fill('').map((_, index) => `$${index + 1}`).join(', ')
}

// read cvs file, filename as table name, the first row as the column name, then insert each row into the DB
export async function insertRows(client: Client, fileName: string) {
    console.debug(`inserting ${fileName}`)
    const records: string[][] = parse(await fs.readFile(`./data/${fileName}.csv`), { delimiter: ',' });
    const columns = (records.shift() as string[])//remove key name records

    for (let i = 0; i < records.length; i++) {
        const query = `INSERT INTO ${fileName}(${columns?.join(', ')}) VALUES(${genValuesString(columns?.length)})`
        const values = records[i].map(c => c || null)
        try { 
            await client.query(query, values) 
        } catch (e) {
            console.error(`insert failed @${i+1}-> `, query, values, e)
            throw e
        }
    }
}

// equipment records need a special insert b/c date_removed can be NULL and PG doesnt like it
export async function insertEquipment(client:Client){
    // TODO: clean up special case for NULL dates for equipment
    // Parse the CSV content
    const equipmentRecords: string[][] = parse(await fs.readFile(`./data/equipment.csv`), { delimiter: ',' });
    equipmentRecords.shift()//remove key name records
    console.debug('inserting equipment')
    for (let i = 0; i < equipmentRecords.length; i++) {
        // does the row have a null date_removed value (if no,  then dont insert)
        const removed = !!equipmentRecords[i][6]
        if (removed) {
            await client.query(`INSERT INTO equipment(id, customer, fleet, equipment_id, equipment_status, date_added, date_removed) VALUES(${genValuesString(7)})`, equipmentRecords[i])
        } else {
            equipmentRecords[i].pop() // remove null date_removed value
            await client.query(`INSERT INTO equipment(id, customer, fleet, equipment_id, equipment_status, date_added) VALUES(${genValuesString(6)})`, equipmentRecords[i])
        }

    }
}