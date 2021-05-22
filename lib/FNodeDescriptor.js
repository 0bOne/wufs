const fs = require('fs');
const path = require('path');

const ByteBuffer = require('./ByteBuffer.js');

module.exports = class FNodeDescriptor
{
	SIGNATURE = "WUFS_F_NODE_INFO";
	CONTENT_START_BYTE = 192;
	
	disk;
	
	fileSystem;
	directory;
	
	attributes;
	ACL;
	timestamp;
	fileSizeBytes;
	name;
	metadata;
	contentBlocks;
	
	canSave = false;
	
	constructor(fileSystem, directory)
	{
		this.disk = fileSystem.disk;
		this.fileSystem = fileSystem;
		this.directory = directory;
	}
	
	LoadDefaults()
	{
		this.blockPosition = this.fileSystem.bitmapBlock.blockPosition + this.fileSystem.bitmapBlock.blocksUsed, 
		this.timestamp = process.hrtime[0];
		this.attributes = 0;
		this.ACL = 0;
		this.name = "/";
		this.metadata = "creator=file system intialize script;",
		this.contentBlocks = [];
		this.canSave = true;
	}
	
	Load()
	{
		const buffer = new ByteBuffer(this.disk.BLOCK_SIZE);
		buffer.Load(this.disk.diskSpec, this.blockPosition);
	
		const testSignature = buffer.GetString(0, 16);
		this.name = buffer.GetString(16, 128);
		this.attributes  = buffer.GetNumber(144, 8);
		this.ACL  = buffer.GetNumber(152, 8);
		this.timeStamp  = buffer.GetNumber(160, 8);	
		const testParentBlockPosition  = buffer.GetNumber(168, 8);
		const extBlockNumberIGnored  = buffer.GetNumber(176, 8);	
		const metadataBlockIngored = buffer.GetNumber(184, 8);
				
	
		if (testSignature !== this.SIGNATURE)
		{
			throw new Error("Root folder signature does not match. Expected " + this.SIGNATURE + " but found " + testSignature);
		}
		
		this.contentBlocks = [];
		let contentBytePosition = this.CONTENT_START_BYTE;		
		let moreChildren = true;
		while (moreChildren === true)
		{
			let blockPosition = buffer.GetNumber(contentBytePosition, 8);
			let blockSize = buffer.GetNumber(contentBytePosition + 8, 8);
			if (childBlock > 0 && childBytePosition < 4096) 
			{
				this.contentBlocks.push({start: blockPosition, count: blockSize});
				contentBytePosition += 16;
			}
			else
			{
				break;
			}
		}

		this.canSave = true;	
		
	}
	
	LoadFromExternalFile(externalFileSpec)
	{
		console.log(externalFileSpec);
		const stats = fs.statSync(externalFileSpec);
		
		this.fileSizeBytes =  stats.size;
		this.name = path.parse(externalFileSpec).base;
		this.timestamp = stats.birthtimeMs * 1000000;
		this.attributes = 0;
		this.ACL = 0;
	
		//allocate a block for THIS descriptor 
		const fNodeDescriptorBlock = this.fileSystem.bitmap.AllocateEmptyBlocks(1);	
		this.blockPosition = fNodeDescriptorBlock.start;
				
		//allocate blocks for the file content 
		const contentBlocksNeeded = Math.ceil(this.fileSizeBytes / this.disk.BLOCK_SIZE); 
		const contentBlock = this.fileSystem.bitmap.AllocateEmptyBlocks(contentBlocksNeeded);	
	//console.log(fNodeDescriptorBlock);
	//console.log(contentBlock);
	//process.exit(1);
		
		this.contentBlocks = [contentBlock];
		this.directory.AddFile(this);
		this.importFileData(externalFileSpec);
		console.log(this);
		
		this.canSave = true;
		this.Save();
		this.fileSystem.bitmap.Save();
		this.directory.Save();
		
		//process.exit(1);
		//console.log(this);		
	}
	
	importFileData(externalFileSpec)
	{	
		let buffer = new ByteBuffer(this.disk.BLOCK_SIZE);
		for (let i = 0; i < this.contentBlocks[0].count; i++)
		{
			let outBlockNumber = this.contentBlocks[0].start + i;  //output into block numbers stored in content blocks
			let inBlockNumber = i; //input from start of file 
			
			buffer.Fill(0);
			buffer.Load(externalFileSpec, inBlockNumber);
			buffer.Save(this.disk.diskSpec, outBlockNumber);	
		}
	}
	
	Save()
	{
		if (this.canSave === false)
		{
			throw new Error("Cannot save a F-Node descriptor that has not been initialized");
		}
		
		console.log("Creating  f-node block to block 0x" + this.blockPosition.toString(16));
		
		const buffer = new ByteBuffer(this.disk.BLOCK_SIZE);  
		
		buffer.AddString(0, this.SIGNATURE);
		buffer.AddString(16, this.name.padEnd(128, "\0"));
		buffer.AddNumber(144, 0, 8);		//attributes					
		buffer.AddNumber(152, 0, 8);		//ACL					
		buffer.AddNumber(160, 0, 8);		//Create Date			
		buffer.AddNumber(168, this.fileSystem.rootFolder.blockPosition, 8);	  	
		buffer.AddNumber(176, 0, 8);		//Extension block			
		buffer.AddNumber(184, 0, 8);		//Metadata block			

		const contentStartByte = this.CONTENT_START_BYTE;

		//TODO: allow for non-contiguous content blocks as well
		buffer.AddNumber(contentStartByte, this.contentBlocks[0].start, 8);
		buffer.AddNumber(contentStartByte + 8, this.contentBlocks[0].count, 8);			

		buffer.Save(this.disk.diskSpec, this.blockPosition); 

	}
	
}