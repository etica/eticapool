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
                    blob: "8bf905809ae7f068ac34643cb28eb19c2a1caccd22d34b10e6d7954301ecb813d75eef6fc54ee2ea2b6f02e0b86051340e31c1e10a5940474ca6fa39c054b4f2900d7867d15715e29f55665d411c5909",
                    job_id: "90000",
                    target: this.target,
                    height: 3182000,
                    seed_hash: "6c04e936f063050f70b86c024b637335dd48c98bd47803a880e2f3bbdaf09642"
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
