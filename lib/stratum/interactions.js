// Define various interaction classes and error messages
class EmptyAnswer {
    constructor (interactionId) {
        this.interactionId = interactionId
    }

    toJSON () {
        return {
            id: this.interactionId,
            result: []
        }
    }
}

class AskFirstJob {
    constructor (blob, seedhash, target, height, jobId, loginId) {
        this.jobId = jobId.toString() // xmrig needs string format
        this.blob = blob
        this.seedhash = seedhash
        this.target = target
        this.height = parseInt(height)
        this.loginId = loginId
    }

    toJSON() {
        return {
            id: 1, 
            jsonrpc: "2.0",
            result: {
                id: "1",
                job: {
                    blob: this.blob,
                    job_id: this.jobId,
                    target: this.target,
                    height: this.height,
                    seed_hash: this.seedhash
                },
                status: "OK"
            },
            error: null
            
        };
    }
}

class AskNewJob {
    constructor(blob, seedhash, target, height, jobId) {
        this.jobId = jobId.toString()  // xmrig needs string format
        this.blob = blob
        this.seedhash = seedhash
        this.target = target
        this.height = parseInt(height)
    }

    toJSON() {
        return {
            jsonrpc: "2.0",
            method: "job",
            params: {
                blob: this.blob,
                target: this.target,
                job_id: this.jobId,
                seed_hash: this.seedhash,
                height: this.height,
                algo:"rx/0"
            }
        };
    }

}


class Answer {
    constructor (interactionId, data) {
        this.interactionId = interactionId
        this.data = data
    }

    toJSON () {
        return {
            id: this.interactionId,
            result: data
        }
    }
}

class PositiveAnswer {
    constructor(interactionId) {
        this.interactionId = interactionId;
    }

    toJSON() {
        return {
            result: {
                status: "OK"
            },
            id: this.interactionId
        };
    }
}


class ErrorAnswer {
    constructor(interactionId, errorKey) {
        this.interactionId = interactionId;
        this.errorKey = errorKey;
    }

    toJSON() {
        const error = errors[this.errorKey];
        console.log('ErrorAnswer this.errorKey is', this.errorKey);
        console.log('ErrorAnswer error is', error);
        return {
            error: {
                message: error.message,
                code: error.code
            },
            id: this.interactionId
        };
    }
}


const errors = {
    "UNKNOWN": { code: 20, message: 'Unknown problem' },
    "JOB_NOT_FOUND": { code: 21, message: 'Job not found' },
    "DUPLICATE_SHARE": { code: 22, message: 'Duplicate share submitted' },
    "LOW_DIFFICULTY_SHARE": { code: 23, message: 'Invalid difficulty' },
    "UNAUTHORIZED_WORKER": { code: 24, message: 'Unauthorized' },
    "NOT_SUBSCRIBED": { code: 25, message: 'Not subscribed' },
    "INVALID_EXTRANONCE": { code: 26, message: 'The submitted nonce does not start with the extraNonce' },
    "POOL_SUSPENDED": { code: 27, message: 'The minting on the pool is actually suspended - probably due to high gas fees' },
    "INVALID_SHARE": { code: 28, message: 'Invalid Share' },
    "INVALID_ADDRESS": { code: 29, message: 'Invalid address' },
    "INVALID_METHOD_NAME": { code: 30, message: 'Invalid method name' },
    "TOOMANY_SHARES": { code: 31, message: 'Too many shares submitted in a row, start with a higher difficulty port' },
    "INVALID_RANDOMX_BLOB": { code: 30, message: 'Invalid randomXBlob, this blob is probably outdated pool sending new job' },
};


/* Former Errors format
class ErrorAnswer {
    constructor (interactionId, error) {
        this.interactionId = interactionId
        this.error = error
    }

    toJSON () {
        return {
            id: this.interactionId,
            result: null,
            error: this.error
        }
    }
}
  Former Errors format  */
/* Former Errors format
const errors = {
    "UNKNOWN": [20, 'Unknown problem', null],
    "JOB_NOT_FOUND": [21, 'Job not found', null],
    "DUPLICATE_SHARE": [22, 'Duplicate share submitted', null],
    "LOW_DIFFICULTY_SHARE": [23, 'Invalid difficulty', null],
    "UNAUTHORIZED_WORKER": [24, 'Unauthorized', null],
    "NOT_SUBSCRIBED": [25, 'Not subscribed', null],
    "INVALID_EXTRANONCE": [26, 'The submitted nonce does not start with the extraNonce', null],
    "POOL_SUSPENDED": [27, 'The minting on the pool is actually suspended - probably due to high gas fees', null],
    "INVALID_SHARE": [28, 'Invalid Share', null],
    "INVALID_ADDRESS": [29, 'Invalid address', null],
    "INVALID_METHOD_NAME": [30, 'Invalid method name', null],
    "TOOMANY_SHARES": [31, 'Too many shares submitted in a row, start with a higher difficulty port', null],
    "INVALID_RANDOMX_BLOB": [30, 'Invalid randomXBlob, this blob is probably outdated pool sending new job', null],
};
Former Errors format */



// Export the interaction classes and error messages
export { AskNewJob, AskFirstJob, EmptyAnswer, Answer, PositiveAnswer, ErrorAnswer, errors };
