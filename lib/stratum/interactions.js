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

class Notify {
    constructor (jobId, challengeNumber, poolAddr, extraNonce, target, difficulty) {
        this.jobId = jobId
        this.challengeNumber = challengeNumber
        this.poolAddr = poolAddr
        this.extraNonce = extraNonce
        this.target = target
        this.difficulty = difficulty
    }

    toJSON () {
        return {
            id: null,
            method: 'mining.notify',
            params: [this.jobId, this.challengeNumber, this.poolAddr, this.extraNonce, this.target, this.difficulty]
        }
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
    constructor (interactionId) {
        this.interactionId = interactionId
    }

    toJSON () {
        return {
            id: this.interactionId,
            result: true
        }
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
    "INVALID_ADDRESS": [29, 'Invalid address', null]
};

// Export the interaction classes and error messages
export { Notify, EmptyAnswer, Answer, PositiveAnswer, ErrorAnswer, errors };
