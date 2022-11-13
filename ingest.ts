/**
 * issues
 * 1. way to sync, could do a lot more work in parrallel
 * 2. hard coded pg config
 * 3. better data modeling in sql
 * 4. need to know how to hanlde null date cleaner (than having special case query)
 * 5. bulk inserts instead of 1 query for each row. works fine with limited test data set, but does not work at scale
 * 6. more/better debugging statments to handle invalid rows from csv's
 * 
 */

import { Client } from 'pg'
import { promises as fs } from 'fs'
import { parse, } from 'csv-parse/sync' // easier for small data set
const PG_HOST = process.env.PG_HOST || 'localhost'

async function main(recreateTables = true) {
    const client = new Client({
        host: PG_HOST,
        port: 5432,
        user: 'candidate',
        password: 'password123',
        database: 'takehome'
    })
    console.debug('connecting to DB')
    await client.connect()

    console.debug('dropping tables if they exist')
    const res = await client.query(`DROP TABLE IF EXISTS equipment, events, locations, waybills CASCADE`)


    /**
     * todo: enums?
     * todo: indecies?
     * todo: constraints
     * todo: secondary index
     * non-null VS nullable columns
     * VCHAR vs TEXT to tighten things up
     */

    console.debug('creating equipment table')
    await client.query(`CREATE TABLE equipment(
        id INT PRIMARY KEY,
        customer TEXT,
        fleet TEXT,
        equipment_id TEXT,
        equipment_status CHAR(1),
        date_added TIMESTAMP,
        date_removed TIMESTAMP
    )`)

    console.debug('creating events table')
    await client.query(`CREATE TABLE events(
        id INT PRIMARY KEY,
        equipment_id TEXT,
        sighting_date TIMESTAMP,
        sighting_event_code INT,
        reporting_railroad_scac TEXT,
        posting_date TIMESTAMP,
        from_mark_id TEXT,
        load_empty_status CHAR(1),
        sighting_claim_code CHAR(1),
        sighting_event_code_text TEXT,
        train_id TEXT,
        train_alpha_code TEXT,
        location_id INT, 
        waybill_id INT
    )`)

    console.debug('creating locations table')
    await client.query(`CREATE TABLE locations(
        id INT PRIMARY KEY,
        city TEXT,
        city_long TEXT,
        station TEXT,
        fsac INT, 
        scac TEXT,
        splc INT,
        state CHAR(2),
        time_zone CHAR(2),
        longitude FLOAT,
        latitude FLOAT,
        country CHAR(2)
    )`)

    console.debug('creating waybills table')
    await client.query(`CREATE TABLE waybills(
        id INT PRIMARY KEY,
        equipment_id TEXT,
        waybill_date TIMESTAMP,
        waybill_number INT,
        created_date TIMESTAMP,
        billing_road_mark_name TEXT,
        waybill_source_code CHAR(1),
        load_empty_status CHAR(1),
        origin_mark_name TEXT,
        destination_mark_name TEXT,
        sending_road_mark TEXT,
        bill_of_lading_number TEXT,
        bill_of_lading_date TIMESTAMP,
        equipment_weight INT,
        tare_weight INT,
        allowable_weight INT,
        dunnage_weight INT,
        equipment_weight_code CHAR(1),
        commodity_code INT,
        commodity_description TEXT,
        origin_id INT, 
        destination_id INT,
        routes JSON,
        parties JSON
    )`)

    // TODO: clean up special case for NULL dates for equipment
    // Parse the CSV content
    const equipmentRecords: string[][] = parse(await fs.readFile(`./data/equipment.csv`), { delimiter: ',' });
    equipmentRecords.shift()//remove key name records
    console.debug('inserting equipment')
    for (let i = 0; i < equipmentRecords.length; i++) {
        // does the row have a null date_removed value (if no,  then dont insert)
        const removed = !!equipmentRecords[i][6]
        if (removed) {
            await client.query(`INSERT INTO equipment(id, customer, fleet, equipment_id, equipment_status, date_added, date_removed) VALUES($1, $2, $3, $4, $5, $6, $7)`, equipmentRecords[i])
        } else {
            equipmentRecords[i].pop() // remove null date_removed value
            await client.query(`INSERT INTO equipment(id, customer, fleet, equipment_id, equipment_status, date_added) VALUES($1, $2, $3, $4, $5, $6)`, equipmentRecords[i])
        }

    }
    await insertRows(client, 'events')
    await insertRows(client, 'locations')
    await insertRows(client, 'waybills')
    await client.end()
}

main()

// generate the values part of the insert query for a given array length (ie $1, $2, .....)
function genValuesString(length: number): string {
    return Array(length).fill('').map((_, index) => `$${index + 1}`).join(', ')
}

// read cvs file, filename as table name, the first row as the column name, then insert each row into the DB
async function insertRows(client: Client, fileName: string) {
    console.debug(`inserting ${fileName}`)
    const records: string[][] = parse(await fs.readFile(`./data/${fileName}.csv`), { delimiter: ',' });
    const columns = (records.shift() as string[])//remove key name records

    for (let i = 0; i < records.length; i++) {
        await client.query(`INSERT INTO ${fileName}(${columns?.join(', ')}) VALUES(${genValuesString(columns?.length)})`, records[i].map(c => c || null))
    }
}

