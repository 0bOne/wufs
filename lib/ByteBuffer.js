const fs = require('fs');

module.exports = class ByteBuffer
{
	
	buffer;
	size;
	
	constructor(size)
	{
		this.size = size;
		this.buffer = new Uint8Array(this.size); 
	}
	
	Load(fileSpec, chunkNumber)
	{
		//Load a whole chunk(sector or block) into the buffer from the disk at specified position (sector number or block number) 
		const position = chunkNumber * this.size;
		const bufferOffset = 0;
		const fd = fs.openSync(fileSpec, "r");
		console.log("Reading 0x" + this.size + " bytes at 0x" + position.toString(16) + " from file " + fileSpec); 
		fs.readSync(fd, this.buffer, bufferOffset, this.size, position);
		fs.closeSync(fd);
	}
	
	Save(fileSpec, chunkNumber)
	{
		//save the buffer (sector or block) into the fie at the specified position (sector number block number) 
		const bufferOffset = 0;
		const position = chunkNumber * this.size;
		const fd = fs.openSync(fileSpec, "rs+");
		console.log("Writing 0x" + this.size + " bytes to 0x" + position.toString(16) + " into file " + fileSpec); 
		fs.writeSync(fd, this.buffer, bufferOffset, this.size, position);
		fs.closeSync(fd);
	}
	
	Fill(value)
	{
		this.buffer.fill(value);
	}
	
	GetString(offset, length)
	{
		let retVal = "";
		
		for (let i = offset; i < (offset + length); i++)
		{
			retVal += String.fromCharCode(this.buffer[i]);
		}
		
		return retVal;
	}

	GetNumber(offset, bytes)
	{
		
		let retVal = 0;
		let multiplier = 1;
		
		for (let i = offset; i < (offset + bytes); i++)
		{
			retVal += this.buffer[i] * multiplier;
			multiplier *= 256;
		}
		
		return retVal;
	}
	
	SetBit(offset, bitNumber)
	{
		//console.log("Setting buffer bit " + bitNumber + " relative to byte offset 0x" + offset.toString(16));
		const byteNumber = offset + parseInt(bitNumber / 8);
		//console.log("Byte number is 0x" + byteNumber.toString(16));
		const bitInByte = bitNumber % 8;
		const bitMask = 1 << bitInByte;
		console.log("\tBefore set 0b" + this.buffer[byteNumber].toString(2) + ", applying mask 0b" + bitMask.toString(2));
		this.buffer[byteNumber] = this.buffer[byteNumber] | bitMask; //bitwise OR;
		console.log("\tAfter set 0b" + this.buffer[byteNumber].toString(2));
	}
	
	TestBit(offset, bitNumber)
	{
		//returns 1 or 0
		console.log("Testing buffer bit " + bitNumber);
		const byteNumber = offset + parseInt(bitNumber / 8);
		const byteToTest = this.buffer[byteNumber]
		
		const bitInByte = bitNumber % 8;
		const bitMask = 1 << bitInByte;
		
		const result = byteToTest & bitMask;
		const retVal = (result > 0) ? 1: 0;	
		return retVal;		
	}
	
	SetBits(offset, bitNumber, count)
	{
		console.log("Setting " + count + " buffer bits " + bitNumber + " relative to byte offset 0x" + offset.toString(16));
		for (let c = 0; c < count; c++)
		{
			this.SetBit(offset, bitNumber + c);
		}
	}	

	AddNumber(offset, value, byteCount)
	{
		//update the buffer's bytes at position 'offset' with little endian number, written to a maximum of 'byteCount' bytes)
		//console.log("Writing " + byteCount + " bytes of little endian 0x" + value.toString(16) + " to buffer at " + offset);
				
		for (let pos = offset; pos < offset + byteCount; pos++)
		{
			let newValue = Math.floor(value / 0x100);
			let byteValue = value - (newValue * 0x100);
			//console.log("\twriting " + byteValue);
			this.buffer[pos] = byteValue;
			value = newValue;
		}	
		
		//console.log("After adding number, buffer contents are:");
		//console.log(this.buffer);

	}
	
	
	AddString(offset, value)
	{
		//console.log("Writing to " + offset.toString(16) + " string: " + value);
		const encoder = new TextEncoder()
		const textBuffer = encoder.encode(value);
		
		for (let i = 0; i < textBuffer.length; i++) 
		{
			this.buffer[offset + i] = textBuffer[i];
		}
		
		//console.log("After adding string, buffer contents are:");
		//console.log(this.buffer);
	}
	
	Dump(context)
	{
		const printables = "abcdefghiljklmnopqrstuvwxyABCDEFGHILJKLMNOPQRSTUVWXY01234567890!@#$%^&*()_-=+~`{[}]\\|:;\"'<>,.?/ ";
		const logLines = [];
		const bufferStartAddress = (context.sectorNumber * context.sectorSize);
		const bufferEndAddress = bufferStartAddress + this.size;

		let byteTotal = 0;
		
		for (let position = 0; position < this.size; position += 16)
		{
			if (position > 0 && position % context.sectorSize === 0)
			{
				context.sectorNumber++; //reached a sector boundary so increment sector number 
			}
			if (position > 0 && position % context.blockSize === 0)
			{
				context.blockNumber++; //reached a block boundary so increment block number 
			}
			
			const startAddress = (context.sectorNumber * context.sectorSize) + position;
			const endAddress = (context.sectorNumber * context.sectorSize) + position + 15;
			let byteLog = "";
			let asciiLog = "";
			for (let byteNumber = position; byteNumber < position + 16; byteNumber++)
			{
				const byteValue = this.buffer[byteNumber];
				byteTotal += byteValue;
				byteLog += byteValue.toString(16).padStart(2, "0") + " ";
				let charValue = String.fromCharCode(byteValue);
				if (printables.indexOf(charValue) == -1)
				{
					charValue = ".";
				}
				asciiLog += charValue;
			}
			
			let logLine = 	context.sectorNumber.toString(16).padStart(4, "0") + " " + 
							context.blockNumber.toString(16).padStart(4, "0") + " "  +
							startAddress.toString(16).padStart(8, "0") + " " + 
							byteLog + " " + 
							asciiLog;
			//console.log("adding logline " + logLine);				
			logLines.push(logLine);
		}
		
		if (byteTotal === 0)
		{
			let logLine = 	context.sectorNumber.toString(16).padStart(4, "0") + " " + 
							context.blockNumber.toString(16).padStart(4, "0") + " "  +
							bufferStartAddress.toString(16).padStart(8, "0") + " to " + 
							bufferEndAddress.toString(16).padStart(8, "0") + " " + 
							"[ALL ZERO]"
			context.logEntries.push(logLine);
		}
		else
		{
			context.logEntries.push(...logLines);
		}
		
	}
	
}