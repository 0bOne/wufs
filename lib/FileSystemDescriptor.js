const ByteBuffer = require('./ByteBuffer.js');
const BitmapDescriptor = require('./BitmapDescriptor.js');
const DNodeDescriptor = require('./DNodeDescriptor.js');
const FNodeDescriptor = require('./FNodeDescriptor.js');

module.exports = class FileSystemDescriptor
{
	SIGNATURE = "WUFS_SYSTEM_INFO";
	disk;
	diskName;
	
	bootSectorCount;
	blocksOnDisk;
	sectorPosition;
	sectorsUsed = 1;
	canSave = false;
	
	constructor (disk)
	{
		this.disk = disk;
		
		this.diskSizeBytes = this.disk.GetSize();
		console.log("Overall disk size is 0x" + this.diskSizeBytes.toString(16));
		
		this.bootSectorCount = this.disk.GetBootSectorCount();
		console.log("First empty sector is " + this.bootSectorCount);

		this.bitmap = new BitmapDescriptor(this);
		this.rootFolder = new DNodeDescriptor(this);

	}
	
	LoadDefaults()
	{
		
		this.sectorPosition = this.bootSectorCount;
		
		this.sectorsUsed = 1;
		this.diskName = "BOOT";
		
		this.blocksOnDisk = Math.floor(this.diskSizeBytes / this.disk.BLOCK_SIZE);			
		
		this.bitmap.LoadDefaults();
		this.rootFolder.LoadDefaults();
		
		this.canSave = true;
	}
	
	Load()
	{
		this.sectorPosition = this.bootSectorCount;
		console.log("Loading file system info from sector " + this.sectorPosition);
		const buffer = new ByteBuffer(this.disk.SECTOR_SIZE); 
		buffer.Load(this.disk.diskSpec, this.sectorPosition);
			
		const testSignature = buffer.GetString(0, 16);		
		this.diskName = buffer.GetString(16, 32)
		this.blocksOnDisk = buffer.GetNumber(48, 8);
		this.bitmap.blockPosition = buffer.GetNumber(56, 8);
		this.bitmap.blocksUsed = buffer.GetNumber(64, 8);
		this.rootFolder.blockPosition = buffer.GetNumber(72, 8);

		
		if (testSignature !== this.SIGNATURE)
		{
			throw new Error("File System signature does not match: " + testSignature + ". Expected " + this.SIGNATURE);
		}
		
		this.bitmap.Load();
		this.rootFolder.Load();

		
		this.canSave = true;
	}
	
	Save()
	{
		if (this.canSave === false)
		{
			throw new Error("Cannot save a file system descriptor that has not been Loaded");
		}
		
		console.log("Saving file system descriptor to sector " + this.sectorPosition);
		const buffer = new ByteBuffer(this.disk.SECTOR_SIZE); 
		
		buffer.AddString(0,  this.SIGNATURE);				
		buffer.AddString(16, this.diskName.padEnd(32, '\0'));		
		buffer.AddNumber(48, this.blocksOnDisk, 4);		
		buffer.AddNumber(56, this.bitmap.blockPosition, 8);			
		buffer.AddNumber(64, this.bitmap.blocksUsed, 8);			
		buffer.AddNumber(72, this.rootFolder.blockPosition, 8);			
		
		buffer.Save(this.disk.diskSpec, this.sectorPosition); 
		
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