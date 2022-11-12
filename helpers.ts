import { Request, Response, NextFunction } from 'express'

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