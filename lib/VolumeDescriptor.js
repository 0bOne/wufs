const ByteBuffer = require('./ByteBuffer.js');
const BitmapDescriptor = require('./BitmapDescriptor.js');
const DNodeDescriptor = require('./DNodeDescriptor.js');
const FNodeDescriptor = require('./FNodeDescriptor.js');

module.exports = class VolumeDescriptor
{
	SIGNATURE = "WUFS_VOLUME_INFO";
	disk;
	systemDescriptor;
	blockPosition;
	blocksUsed = 1;
	blocksInVolume;
	name;
	metadata;
	
	bitmap;
	rootFolder;
	
	canSave = false;
	
	constructor(systemDescriptor)
	{
		this.disk = systemDescriptor.disk;
		this.systemDescriptor = systemDescriptor;
		this.bitmap = new BitmapDescriptor(this);
		this.rootFolder = new DNodeDescriptor(this);
	}
	
	LoadDefaults()
	{
		const firstEmptySector = this.systemDescriptor.bootSectorCount + 1; 
		const firstEmptyByte = firstEmptySector * this.disk.SECTOR_SIZE;	
		const firstEmptyBlock = Math.ceil(firstEmptyByte / this.disk.BLOCK_SIZE); 
		console.log("First empty block is " + firstEmptyBlock);
		
		this.blockPosition = firstEmptyBlock,
		this.blocksInVolume = this.systemDescriptor.blocksOnDisk - (firstEmptyBlock + 1),
		this.name = "Bootable Volume 0";
		this.metadata = "creator=file system intialize script;createDate=" + new Date();
		
		console.log("First volume address is 0x" + this.blockPosition.toString(16));
		
		this.bitmap.LoadDefaults();
		this.rootFolder.LoadDefaults();
		
		this.canSave = true;
	}
	
	Load()
	{

		const buffer = new ByteBuffer(this.disk.BLOCK_SIZE);
		buffer.Load(this.disk.diskSpec, this.blockPosition);
	
		const testSignature =  buffer.GetString(0, 16);
		this.blocksInVolume = buffer.GetNumber(16, 8);
	
		this.rootFolder.blockPosition = buffer.GetNumber(24, 8);
		this.bitmap.blockPosition = buffer.GetNumber(32, 8)
		const nameLength = buffer.GetNumber(40, 2);
		const metadataLength = buffer.GetNumber(42, 2);
		this.name = buffer.GetString(44, nameLength);
		this.metadata = buffer.GetString(44 + nameLength, metadataLength);
			
		if (testSignature !== this.SIGNATURE)
		{
			throw new Error("Volume signature does not match. Expected " + this.SIGNATURE + " but found " + testSignature);
		}
		
		this.bitmap.Load();
		this.rootFolder.Load();
		
		this.canSave = true;
	}
		
	SaveBlock()
	{
		
		if (this.canSave === false)
		{
			throw new Error("Cannot save a volume descriptor that has not been loaded");
		}
		
		console.log("Saving volume descriptor to block 0x" + this.blockPosition.toString(16));
		
		const buffer = new ByteBuffer(this.disk.BLOCK_SIZE); 

		buffer.AddString(0, this.SIGNATURE);						//16 byte Signature
		buffer.AddNumber(16, this.blocksInVolume, 8);				//Volume size 						[8 bytes]  offset 16
		buffer.AddNumber(24, this.rootFolder.blockPosition, 8);		//Root directory d-Node block start	[8 bytes]  offset 24
		buffer.AddNumber(32, this.bitmap.blockPosition, 8);			//Volume bitmap block start 		[8 bytes]  offset 32
		buffer.AddNumber(40, this.name.length, 2);					//Volume name size					[2 bytes]  offset 40
		buffer.AddNumber(42, this.metadata.length, 2);				//Volume metadata size				[2 bytes]  offset 42
		buffer.AddString(44, this.name);							//Volume name						[n bytes]  offset 44
		buffer.AddString(44 + this.name.length, this.metadata); 	//Volume metadata 					[n bytes]
	
		buffer.Save(this.disk.diskSpec, this.blockPosition); 

	}
	
	SaveFileChanges()
	{
		//no need to save volume block as it hasn't changed. just save the new bitmap and root folder
		this.bitmap.Save();
		this.rootFolder.Save();
	}
	
	AddFile(folderPath, specToAdd)
	{
		if (folderPath !== "/")
		{
			throw new Error("Adding to folder other than root folder not currently supported");
		}	
		const fileDescriptor = new FNodeDescriptor(this, this.rootFolder);
		fileDescriptor.LoadFromExternalFile(specToAdd);
	}

	
}