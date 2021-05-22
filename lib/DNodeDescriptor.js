const ByteBuffer = require('./ByteBuffer.js');

module.exports = class DNodeDescriptor
{
	SIGNATURE = "WUFS_D_NODE_INFO";
	
	disk;
	fileSystem;
	
	blocksUsed = 1;
	attributes; 	
	ACL;
	timestamp;
	childCount
	name;
	metadata;
	childBlocks;
	
	canSave = false;
	
	constructor(fileSystem)
	{
		this.disk = fileSystem.disk;
		this.fileSystem = fileSystem;
	}
	
	LoadDefaults()
	{
		this.blockPosition = this.fileSystem.bitmap.blockPosition + this.fileSystem.bitmap.blocksUsed;
				
		this.timestamp = process.hrtime[0];
		this.attributes = 0;
		this.ACL = 0;
		this.childCount = 0;
		this.name = "/";
		this.childBlocks = [];
		this.canSave = true;
	}
	
	Load()
	{
		const buffer = new ByteBuffer(this.disk.BLOCK_SIZE);
		buffer.Load(this.disk.diskSpec, this.blockPosition);
	
		const testSignature = buffer.GetString(0, 16);
		this.name  = buffer.GetString(16, 64);
		this.attributes  = buffer.GetNumber(80, 8);
		this.ACL  = buffer.GetNumber(88, 8);
		this.timeStamp  = buffer.GetNumber(96, 8);	
		const testParentBlockPosition  = buffer.GetNumber(104, 8);
		const testExtensionBlock = buffer.GetNumber(112, 8);
		const testMetadataBlock = buffer.GetNumber(120, 8);
		
	
		if (testSignature !== this.SIGNATURE)
		{
			throw new Error("Root folder signature does not match. Expected " + this.SIGNATURE + " but found " + testSignature);
		}
		
		
		//align the child block list to the next 8 bytes
		this.childBlocks = [];
		const childBytePosition = 128;
		let moreChildren = true;
		while (moreChildren === true)
		{
			let childBlock = buffer.GetNumber(childBytePosition);
			if (childBlock > 0 && childBytePosition < 4096) 
			{
				this.childNodes.push(childBlock);
				childBytePosition += 8;
			}
			else
			{
				break;
			}
		}
		//TODO: check the extension block for more children and read those in as well
		
		this.canSave = true;	
		
	}
	

	
	Save()
	{
		if (this.canSave === false)
		{
			throw new Error("Cannot save a D-node descriptor that has not been initialized");
		}
		
		console.log("Creating  d-node descriptor to block 0x" + this.blockPosition.toString(16));
		
		const buffer = new ByteBuffer(this.disk.BLOCK_SIZE);  
	
		buffer.AddString(0, this.SIGNATURE);			
		buffer.AddNumber(16, this.name.padEnd(64, 0), 4);  		
		buffer.AddNumber(80, 0, 8);		//attributes				
		buffer.AddNumber(88, 0, 8);		//ACL						
		buffer.AddNumber(96, 0, 8);		//Timestamp				
		buffer.AddNumber(104, 0, 8);	//parent d-node position
		buffer.AddNumber(112, 0, 8);	//extension block position	
		buffer.AddNumber(120, 0, 8);	//metadata block position

		const childStartByte = 128;
		
		for (let c = 0; c < this.childBlocks.length; c++)
		{
			let pos = childStartByte + (c * 8);
			console.log("d-node: adding 8 byte child block 0x" + this.childBlocks[c].toString(16) + " at byte 0x" + pos.toString(16));
			buffer.AddNumber(pos, this.childBlocks[c], 8);
		}
				
		buffer.Save(this.disk.diskSpec, this.blockPosition); 
		
		
	}
	
	AddFile(newFNode)
	{
		//add the file to the child nodes 		
		this.childBlocks.push(newFNode.blockPosition);
	}

	//TODO: LoadContents() - loads child decriptors
	
}