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
    constructor (blob, target, jobId, loginId) {
        this.jobId = jobId
        this.blob = blob
        this.target = target
        this.loginId = loginId
    }

    toJSON() {
        return {
            id: 1, 
            jsonrpc: "2.0",
            result: {
                id: "1",
                job: {
                    blob: "0x15b5584cf95dd4b07e9e2c30c5a3d015527e07e35f2f1a614ce7f5e8f943ae37",
                    job_id: "83510",
                    target: "ff7fffff",
                    height: 3182000,
                    seed_hash: "25314901c96d26ff28484bddf315f0a3295f30f13590d056efd65fcb6d8da788"
                },
                status: "OK"
            },
            error: null
            
        };
    }
}

class AskNewJob {
    constructor(blob, target, jobId) {
        this.jobId = jobId
        this.blob = blob
        this.target = target
    }

    toJSON() {
        return {
            id: 1,
            jsonrpc: "2.0",
            method: "job",
            params: {
                blob: this.blob,
                target: this.target,
                job_id: this.jobId
            },
            error: null
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
    "INVALID_METHOD_NAME": [30, 'Invalid method name', null]
};

// Export the interaction classes and error messages
export { AskNewJob, AskFirstJob, EmptyAnswer, Answer, PositiveAnswer, ErrorAnswer, errors };
