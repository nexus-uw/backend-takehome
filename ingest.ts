/**
 * issues
 * 1. way too synchronous, could do a lot more work in parrallel
 * 2. hard coded pg config
 * 3. better data modeling in sql
 * 4. need to know how to hanlde null date cleaner (than having special case query)
 * 5. bulk inserts instead of 1 query for each row. works fine with limited test data set, but does not work at scale
 */

import { Client } from 'pg'
import { parse, } from 'csv-parse/sync' // easier for small data set
import { insertEquipment, insertRows } from './helpers'
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

    if (recreateTables) {
        console.debug('dropping tables if they exist')
        await client.query(`DROP TABLE IF EXISTS equipment, events, locations, waybills CASCADE`)

        /**
         * todo: enums?
         * todo: constraints
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
        await client.query(`CREATE INDEX equipment_id_hash ON equipment USING hash (equipment_id)`) // creat hash b/c we do search against this column, but the value is not the primary key (or unique)


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
        equipment_id TEXT ,
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
        origin_id INT REFERENCES locations (id), 
        destination_id INT REFERENCES locations (id),
        routes JSON,
        parties JSON
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
        location_id INT REFERENCES locations (id), 
        waybill_id INT REFERENCES waybills (id)
    )`)
        await client.query(`CREATE INDEX posting_data_b_tree ON events USING btree (posting_date)`) // create index on posting_date since we have date range filters on it
    } else {
        console.debug('deleting all rows from tables')
        await client.query(`DELETE from events`)
        await client.query(`DELETE from waybills`)
        await client.query(`DELETE from locations`)
        await client.query(`DELETE from equipment`)
    }
    await insertEquipment(client)
    await insertRows(client, 'locations')
    await insertRows(client, 'waybills')
    await insertRows(client, 'events')
    await client.end()
}

main() // pass false to keep the existing table definitions



