import {EventEmitter} from "events";

export default class GeneralEventEmitterHandler extends EventEmitter {

    constructor() {
        super();
    }

    static getInstance() {
        console.log('getting instance');
        if (!GeneralEventEmitterHandler.instance) {
            console.log('creating new instance');
            GeneralEventEmitterHandler.instance = new GeneralEventEmitterHandler();
        }
        return GeneralEventEmitterHandler.instance;
    }
}

GeneralEventEmitterHandler.instance = null;