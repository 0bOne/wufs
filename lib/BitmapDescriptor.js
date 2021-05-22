const ByteBuffer = require('./ByteBuffer.js');

module.exports = class BitmapDescriptor
{
	BITMAP_START_BYTE = 32;
	SIGNATURE = "WUFS_BITMAP_INFO";
	TAIL = "WUFS_BITMAP_TAIL";

	fileSystem;
	disk; 
	buffer;
	
	blockPosition;
	blocksUsed;
	
	canSave = false;
	
	constructor(fileSystem)
	{
		this.fileSystem = fileSystem;
		this.disk = this.fileSystem.disk;
		this.buffer = new ByteBuffer(this.disk.BLOCK_SIZE);  
	}
	
	LoadDefaults()
	{

		const fsBytePos = this.fileSystem.sectorPosition * this.disk.SECTOR_SIZE;
		this.blockPosition = Math.ceil(fsBytePos / this.disk.BLOCK_SIZE);

		const blockSizeBytes = this.BITMAP_START_BYTE + Math.ceil(this.fileSystem.blocksOnDisk / 8 ) + 16; //1 bit per block + 16 for the signature + 16 for the tail signature
		this.blocksUsed = Math.ceil(blockSizeBytes / this.disk.BLOCK_SIZE);
		
		this.buffer.SetBits(this.BITMAP_START_BYTE, 0, this.fileSystem.rootFolder.blocksUsed); //mark root folder usage as zeroth bit on.
		
		this.canSave = true;
	}
	
	Load()
	{
		this.buffer.Load(this.disk.diskSpec, this.blockPosition);
		
		const testSignature = this.buffer.GetString(0, 16);
		const testParentBlockPosition = this.buffer.GetNumber(16, 8);
		
		
		if (this.SIGNATURE !== testSignature)
		{
			throw new Error("Bitmap signature does not match. Expected " + this.SIGNATURE + " but found " + testSignature);
		}
		
		this.canSave = true;		
	}
	
	Save()
	{
		if (this.canSave === false)
		{
			throw new Error("Cannot save a bitmap descriptor that has not been initialized");
		}
		
		console.log("Saving bitmap descriptor to block 0x" + this.blockPosition.toString(16));
		
		//TODO: when the bitmap needs to span more than one block, the current way of saving blocks won't support it
		//so add an expand method that creates a buffer with multiple of the block size
					
		this.buffer.AddString(0, this.SIGNATURE);				 		//16 byte Signature
		this.buffer.AddNumber(16, 0, 8);								//FS parent block addr				[8 bytes] offset 16
		this.buffer.AddString(this.tailPosition, this.TAIL);
		
		this.buffer.Save(this.disk.diskSpec, this.blockPosition); 
	}
	
	AllocateEmptyBlocks(neededBlocks)
	{
		//scans the bitmap for contiguous unused blocks and allocates them to the fnode
		
		let foundBlocks = [];
		let foundBits = [];
		let bitNumber = 0;
		let blockNumber = this.fileSystem.rootFolder.blockPosition; 
	
		const bitCount = Math.ceil(this.fileSystem.blocksOnDisk / 8) * 8;
		
		
		for (let bitNumber = 0; bitNumber < bitCount; bitNumber++)
		{
			let result = this.buffer.TestBit(this.BITMAP_START_BYTE, bitNumber);
			if (result === 1)
			{
				//holds a one, so it's used. reset the found blocks
				console.log("Test byte value is " + result + ". Unsuable block 0x" + blockNumber.toString(16));
				foundBlocks = [];
				foundBits = [];
			}
			else
			{
				//holds a zero, so it's available, add to the found counter;
				console.log("Test byte value is " + result + ". Potentially usable block 0x" + blockNumber.toString(16));
				foundBlocks.push(blockNumber);
				foundBits.push(bitNumber);
			}
						
			if (foundBlocks.length === neededBlocks)
			{	
				break;		
			}
			blockNumber++;
		}  //search every byte
		
		if (foundBlocks.length === neededBlocks)
		{
			console.log("Found " + foundBlocks.length + " empty blocks at block 0x" + blockNumber.toString(16));
			
			//set the bits
			this.buffer.SetBits(this.BITMAP_START_BYTE, foundBits[0], foundBits.length);
			const retVal = {start: foundBlocks[0], count: foundBlocks.length};
			console.log("returning");
			console.log(retVal);
			return retVal;
		}
		else
		{
			throw new Error("Could not find a contiguous set of " + neededBlocks + " blocks in bitmap. unable to continue");
			//TODO: implement non-contiguous block support if it becomes necessary (no reason file should always be contiguous)
		}
	}
	
}