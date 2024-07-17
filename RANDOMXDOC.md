## RANDOMX INFORMATION | HELPER

### How randomx mining pools calculate the target to send to miners?

The full 256-bit targets space are compressed into 32-bit representations for efficiency in communication between pools and miners.
The system includes methods for converting between full 256-bit targets, 32-bit compact targets, and difficulty values.
Pool converts 256-bit blockchain target to a 32-bit compact representation.
Pool sends this compact target to miners as part of a job.
Miners receive the job and convert the compact target back to a difficulty value.

To convert a 256-bit target to the 32-bit representation expected by miners:

    Start with the 256-bit target.
    Calculate the equivalent difficulty: difficulty = (2^256 - 1) / target
    Take only the most significant 32 bits of this result.
    Swap the byte order (endianness) of these 32 bits.
    Pad the result to 8 hexadecimal digits.

Examples with Actual Values: Example 1:
256-bit target: 241210905721997303218596142046449620042433489913738428771172669245410596

    Calculate difficulty: (2^256 - 1) / 241210905721997303218596142046449620042433489913738428771172669245410596 ≈ 1
    Since this difficulty is too low, let's use a more reasonable value, say 1000
    Calculate 32-bit representation: ((2^256 - 1) / 1000) >> 224 ≈ 0xFFFFFF
    Swap endianness and pad: FFFFFF00
    Final compact target to send to miners: "ffffff00"

Example 2:
Let's say we want a higher difficulty, around 1,000,000

    Start with difficulty 1,000,000
    Calculate 32-bit representation: ((2^256 - 1) / 1,000,000) >> 224 ≈ 0xFFFF
    Swap endianness and pad: FFFF0000
    Final compact target to send to miners: "ffff0000"

Example 3:
For a very high difficulty, say 1,000,000,000

    Start with difficulty 1,000,000,000
    Calculate 32-bit representation: ((2^256 - 1) / 1,000,000,000) >> 224 ≈ 0xFFFF
    Swap endianness and pad: FFFF0000
    Final compact target to send to miners: "ffff0000"

Note that in the last two examples, due to the limitations of the 32-bit representation, very high targets may result in the same compact target. This is one of the limitations of this legacy system.

###  Use larger difficulty represention

Current Implementation foolows what most monero randomx pools have implemented and is based on a 32 bytes targets representations. But 32 bytes limits range of targets and is is limited for higher targets. That's why XMRig has implemented a 64 bytes difficulty system but most pools didn't impplemented it and are still on 32bytes targets.

The current system uses a 32-bit compact representation for targets, which is a legacy approach inherited from earlier cryptocurrency implementations. This method has limitations, especially for very high targets.
Why implement 64 bytes targets:
    To handle a wider range of targets more accurately
    To future-proof the mining protocol against increasing network hashrates


Useful links about that:

1. https://monero.stackexchange.com/questions/11965/how-to-calculate-job-target-in-hex
Where XMRig handles targets and difficulties conversions and we can see 64bytes support:
XMRig implementation (Job.cpp):
- Handles targets up to 64 bits
- Converts targets to difficulty values
- Located in xmrig/src/base/net/stratum/Job.cpp