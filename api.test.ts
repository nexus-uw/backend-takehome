import { describe, it, } from 'mocha'
import axios, { AxiosError } from 'axios'
import { expect } from 'chai'
const TARGET = 'http://localhost:8000'
describe('api tests', () => {
    it('should GET /equipment', async () => {
        const res = await axios.get(TARGET + '/equipment')
        expect(res.data).to.be.ok
    })
    it('should GET /locations', async () => {
        const res = await axios.get(TARGET + '/locations')
        expect(res.data).to.be.ok
    })

    describe('events', () => {
        it('should GET /events', async () => {
            const res = await axios.get(TARGET + '/events')
            expect(res.data).to.have.length.greaterThan(0) // we should return a list of results
        })
        it('should GET /events with a start_posting_date', async () => {
            const res = await axios.get(TARGET + '/events?start_posting_date=2222-10-10')
            expect(res.data).to.have.length.lessThanOrEqual(0) // start date should filter everything out
        })
        it('should GET /events with an ending_posting_date', async () => {
            const res = await axios.get(TARGET + '/events?end_posting_date=1900-10-10')
            expect(res.data).to.have.length.lessThanOrEqual(0)// end date should filter everything out
        })
        it('should GET /events with a start_posting_date and ending_posting_date', async () => {
            const res = await axios.get(TARGET + '/events?start_posting_date=2000-10-10&end_posting_date=2222-10-10')
            expect(res.data).to.have.length.greaterThan(0) // we should return a list of results
        })
        // TODO
        it('should not GET /events with an invalid start_posting_date', async () => {
            try {
                await axios.get(TARGET + '/events?start_posting_date=INVALID_DATE')
                throw 'should error'
            } catch (e: any) {
                expect((e as AxiosError).response?.status).equals(400)
            }

        })
        // TODO
        it('should not GET /events with an invalid ending_posting_date', async () => {
            try {
                await axios.get(TARGET + '/events?end_posting_date=INVALID_DATE')
                throw 'should error'
            } catch (e: any) {
                expect((e as AxiosError).response?.status).equals(400)
            }

        })
    })

    it('should GET /waybills', async () => {
        const res = await axios.get(TARGET + '/waybills')
        expect(res.data).to.be.ok
    })
    describe('get waybill by id', () => {
        it('should GET /waybills/:id', async () => {
            const res = await axios.get(TARGET + '/waybills/1')
            expect(res.data).to.be.ok
        })
        it('should 400 if id is not an int', async () => {
            try {
                await axios.get(TARGET + '/waybills/INVALID')
                throw 'should error'
            } catch (e: any) {
                expect((e as AxiosError).response?.status).equals(400)
            }
        })
        it('should 404 if id is not found', async () => {
            try {
                await axios.get(TARGET + '/waybills/9999')

                throw 'should error'
            }
            catch (e: any) {

                expect(e.response?.status).equals(404)

            }
        })

        describe('equipment', () => {
            it('should GET /waybills/:id/equipment', async () => {
                const res = await axios.get(TARGET + '/waybills/7/equipment')
                expect(res.data).to.have.length.greaterThan(0)
            })
            it('should return an empty list if no equipment or waybill exists', async () => {
                const res = await axios.get(TARGET + '/waybills/9999/equipment')
                expect(res.data).to.have.lengthOf(0)
            })
            it('should 400 if id is not an int', async () => {
                try {
                    await axios.get(TARGET + '/waybills/INVALID/equipment')
                    throw 'should error'
                } catch (e: any) {
                    expect((e as AxiosError).response?.status).equals(400)
                }
            })

        })

        describe('events', () => {
            it('should GET /waybills/:id/events', async () => {
                const res = await axios.get(TARGET + '/waybills/7/events')
                expect(res.data).to.have.length.greaterThan(0)
            })
            it('should GET /waybills/:id/events with a start_posting_date', async () => {
                const res = await axios.get(TARGET + '/waybills/7/events?start_posting_date=2222-10-10')
                expect(res.data).to.have.length.lessThanOrEqual(0)
            })
            it('should GET /waybills/:id/events with a start_posting_date and ending_posting_date', async () => {
                const res = await axios.get(TARGET + '/waybills/7/events?start_posting_date=1900-10-10&end_posting_date=2222-10-10')
                expect(res.data).to.have.length.greaterThan(0)
            })
            it('should GET /waybills/:id/events with an ending_posting_date', async () => {
                const res = await axios.get(TARGET + '/waybills/7/events?end_posting_date=1900-10-10')
                expect(res.data).to.have.length.lessThanOrEqual(0)
            })
            it('should not GET /events with an invalid start_posting_date', async () => {
                try {
                    await axios.get(TARGET + '/waybills/1/events?start_posting_date=INVALID')
                    throw 'should error'
                } catch (e: any) {
                    expect((e as AxiosError).response?.status).equals(400)
                }
            })
            it('should not GET /events with an invalid ending_posting_date', async () => {
                try {
                    await axios.get(TARGET + '/waybills/1/events?end_posting_date=INVALID')
                    throw 'should error'
                } catch (e: any) {
                    expect((e as AxiosError).response?.status).equals(400)
                }
            })
            it('should 400 if id is not an int', async () => {
                try {
                    await axios.get(TARGET + '/waybills/INVALID/events')
                    throw 'should error'
                } catch (e: any) {
                    expect((e as AxiosError).response?.status).equals(400)
                }
            })
        })

        describe('locations', () => {
            it('should GET /waybills/:id/locations', async () => {
                const res = await axios.get(TARGET + '/waybills/7/locations')
                expect(res.data).to.have.length.greaterThan(0)
            })
            it('should return an empty list if no locations or waybill exists', async () => {
                const res = await axios.get(TARGET + '/waybills/999/events')
                expect(res.data).to.have.length.lessThanOrEqual(0)
            })
            it('should 400 if id is not an int', async () => {
                try {
                    await axios.get(TARGET + '/waybills/INVALID/locations')
                    throw 'should error'
                } catch (e: any) {
                    expect((e as AxiosError).response?.status).equals(400)
                }
            })
        })
    })
})