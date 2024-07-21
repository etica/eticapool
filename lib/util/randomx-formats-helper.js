import web3utils from 'web3-utils'


export function convertWithout0x(_data){
    return _data.startsWith('0x') ? _data.slice(2) : _data;
}

export function convertAdd0x(_data){
    console.log('calling convertAdd0x for: ', _data);
    var _test = '0x' + _data;
    console.log('calling convertAdd0x result _test: ', _test);
    return '0x' + _data;
}

export function convertToRawWithout0x(_data) {
    // Check if _data is null or undefined
    if (_data == null) {
        console.warn('convertToRawWithout0x: Input data is null or undefined');
        return '';
    }

    // Ensure _data is a string
    if (typeof _data !== 'string') {
        console.warn('convertToRawWithout0x: Input is not a string, attempting to convert');
        try {
            _data = String(_data);
        } catch (error) {
            console.error('convertToRawWithout0x: Failed to convert input to string', error);
            return '';
        }
    }

    // Trim any whitespace
    _data = _data.trim();

    // Check if the string is empty after trimming
    if (_data === '') {
        console.warn('convertToRawWithout0x: Input string is empty');
        return '';
    }

    // Remove '0x' prefix if it exists
    return _data.toLowerCase().startsWith('0x') ? _data.slice(2) : _data;
}


export function convertTargetToCompact(target) {
    // Remove '0x' prefix if present
    target = target.startsWith('0x') ? target.slice(2) : target;
    
    // Convert target to BigNumber
    const targetBN = new web3utils.BN(target, 16);
    
    // Calculate difficulty: (2^256 - 1) / target
    const maxTarget = new web3utils.BN(2).pow(new web3utils.BN(256)).sub(new web3utils.BN(1));
    const difficulty = maxTarget.div(targetBN);
    
    // Calculate 32-bit representation: ((2^256 - 1) / difficulty) >> 224
    const compactTarget = maxTarget.div(difficulty).shrn(224);
    
    // Convert to hexadecimal and pad to 8 characters
    let compactHex = compactTarget.toString(16).padStart(8, '0');
    
    // Swap endianness
    compactHex = compactHex.match(/.{2}/g).reverse().join('');
    
    return compactHex;
} 

/*
function testCompactTargetConversion() {
    const difficulties = [1, 10, 100, 1000, 10000, 100000, 1000000];
    
    difficulties.forEach(difficulty => {
        // Calculate full target
        const maxTarget = new web3utils.BN(2).pow(new web3utils.BN(256)).sub(new web3utils.BN(1));
        const fullTarget = maxTarget.div(new web3utils.BN(difficulty));
        
        // Convert to compact target
        const compactTarget = this.convertTargetToCompact(fullTarget.toString(16));
        
        // Convert compact target back to difficulty for verification
        const compactTargetBN = new web3utils.BN(compactTarget, 16);
        const backCalculatedDifficulty = maxTarget.div(compactTargetBN.shln(224));
        
        console.log(`Difficulty: ${difficulty}`);
        console.log(`Full Target: 0x${fullTarget.toString(16)}`);
        console.log(`Compact Target: ${compactTarget}`);
        console.log(`Back-calculated Difficulty: ${backCalculatedDifficulty.toString()}`);
        console.log('---');
    });
} */