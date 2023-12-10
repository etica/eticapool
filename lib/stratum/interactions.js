// Define various interaction classes and error messages
class SetExtranonce {
    constructor (nonce) {
        this.nonce = nonce
        this.reservedBytes = 6
    }

    toJSON () {
        return {
            method: 'set_extranonce',
            params: [this.nonce, this.reservedBytes]
        }
    }
}

class SetDifficulty {
    constructor (difficulty) {
        this.difficulty = difficulty
    }

    toJSON () {
        return {
            method: 'mining.set_difficulty',
            params: [this.difficulty]
        }
    }
}

class FirstNotify {
    constructor (interactionId, sessionId, extraNonce) {
        this.interactionId = interactionId
        this.sessionId = sessionId
        this.signature = "EthereumStratum/1.0.0"
        this.extraNonce = extraNonce
    }

    toJSON () {
        return {
            id: this.interactionId,
            result: [["mining.notify",this.sessionId,"EthereumStratum/1.0.0"],this.extraNonce],
            error: null
        }
    }
}

class Notify {
    constructor (jobId, challengeNumber, poolAddr, target, difficulty, extranonce) {
        this.jobId = jobId
        this.challengeNumber = challengeNumber
        this.poolAddr = poolAddr
        this.target = target
        this.difficulty = difficulty
        this.extranonce = extranonce
    }

    toJSON () {
        return {

            method: 'mining.notify',
            params: [this.jobId, this.challengeNumber, this.poolAddr, this.target, this.difficulty, this.extranonce]
        }
    }
}

class Answer {
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
};

// Export the interaction classes and error messages
export { SetExtranonce, SetDifficulty, FirstNotify, Notify, Answer, ErrorAnswer, errors };
