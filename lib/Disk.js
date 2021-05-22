const fs = require('fs');
const path = require('path');
const ByteBuffer = require('./ByteBuffer.js');


module.exports = class Disk
{
	SECTOR_SIZE = 512;
	BLOCK_SIZE = 4096;
	SECTORS_PER_BLOCK;
	LOADER_SIZE_LOCATION = 0x1FA; //location of boot loader size (in sectors), if present
	BOOT_SECTOR_SIGNATURE = 0xAA55; //signature indicating a boot sector exists
	
	diskSpec;
	
	constructor(diskSpec)
	{
		this.SECTORS_PER_BLOCK = this.BLOCK_SIZE / this.SECTOR_SIZE;
		this.diskSpec = path.resolve(diskSpec);
	}
	
	Create(sizeMiB)
	{
		//expand the disk to the full size by writing empty sectors until done.
		console.log("Creating disk of " + sizeMiB + " MiB");
		const requiredSizeBytes = 1024 * 1024 * sizeMiB;
		let blockCount = requiredSizeBytes / this.BLOCK_SIZE;

		console.log("required overall size " + requiredSizeBytes);
		console.log("required blocks is " + blockCount);

		const appendBuffer = new Uint8Array(this.BLOCK_SIZE);
				
		while(blockCount > 0)
		{
			fs.appendFileSync(this.diskSpec, appendBuffer);
			blockCount--;
		}
		
		const stats = fs.statSync(this.diskSpec);
		console.log("Created disk file size " + stats.size);
	}
	
	GetSize()
	{
		return fs.statSync(this.diskSpec).size;
	}
	
	AddBootLoader(loaderSpec)
	{
		const blockNumber = 0;
		this.InsertFileBlocks(loaderSpec, blockNumber);
		
		//read in the first sector and add sector size
		const stats = fs.statSync(loaderSpec);
		const sectorCount = Math.ceil(stats.size / this.SECTOR_SIZE);
		
		//write 2 bytes that hold the number of sectors
		const buffer = new ByteBuffer(this.SECTOR_SIZE);
		buffer.Load(this.diskSpec, 0);
		buffer.AddNumber(this.LOADER_SIZE_LOCATION, sectorCount, 2); 
		buffer.Save(this.diskSpec, 0);
		console.log("Saved sector count 0x" + sectorCount.toString(16) + " to disk at 0x" + this.LOADER_SIZE_LOCATION.toString(16));		
	}
	
	GetBootSectorCount()
	{
		let ret = 0;
		const buffer = new ByteBuffer(this.SECTOR_SIZE);
		buffer.Load(this.diskSpec, 0);
		let loaderSignature = buffer.GetNumber(this.SECTOR_SIZE - 2, 2);
		//console.log("Loader Signature is 0x" + loaderSignature.toString(16));
		if (loaderSignature == this.BOOT_SECTOR_SIGNATURE)
		{
			ret = buffer.GetNumber(this.LOADER_SIZE_LOCATION, 2);
			console.log ("Boot sector count is " + ret);
		}
		return ret;		
	}
	
	InsertFileBlocks(newFileSpec, startBlock)
	{
		const buffer = new ByteBuffer(this.BLOCK_SIZE);
		const stats = fs.statSync(newFileSpec);
		
		let inBlock = 0;
		let outBlock = startBlock;		
		let blocksRemaining = Math.ceil(stats.size/this.BLOCK_SIZE);

		while (blocksRemaining > 0)
		{
			buffer.Fill(0); //fill buffer with zeros in case last block is a partial file, which would otherwise leave noise in the buffer
			buffer.Load(newFileSpec, inBlock);
			buffer.Save(this.diskSpec, outBlock);
			
			inBlock++;
			outBlock++;
			
			blocksRemaining--;
		}
		
		console.log("Copied 0x" + stats.size.toString(16) + " bytes");
	}
	
	findFileSystemHeaderSector(loaderSizePosition)
	{
		const buffer = new ByteBuffer(this.diskSpec, this.SECTOR_SIZE);
		buffer.loadFromSector(0);
		
		const sectorCount = buffer.GetNumber(this.LOADER_SIZE_LOCATION, 2);
		console.log("Sector count is " + sectorCount);
		
		this.fileSystemHeaderSector = sectorCount;
		const fsHeaderByte = sectorCount * args.sectorSize;
		
		console.log("First sector after loader is " + fileSystemHeaderSector);
		console.log("  or 0x" + fsHeaderByte.toString(16));
	}
		
}