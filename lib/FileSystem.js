const fs = require('fs');
const path = require('path');
const ByteBuffer = require('./ByteBuffer.js');
const FileSystemDescriptor = require('./FileSystemDescriptor.js');
const VolumeDescriptor = require('./VolumeDescriptor.js');
const FNodeDescriptor = require('./FNodeDescriptor.js');

module.exports = class FileSystem
{

	disk;
	fileSystemDescriptor;
			
	constructor(disk)
	{
		this.disk = disk;
	}
		
	Reinitialize()
	{
		this.fileSystemDescriptor = new FileSystemDescriptor(this.disk);
		this.fileSystemDescriptor.LoadDefaults();
		
		this.fileSystemDescriptor.Save();
	}
	
	Load()
	{
		this.fileSystemDescriptor  = new FileSystemDescriptor(this.disk);
		this.fileSystemDescriptor.Load();
		//console.log(this.fileSystemDescriptor);
	}
	
	AddFile(volumeNumber, folderPath, specToAdd)
	{
		this.fileSystemDescriptor.AddFile(folderPath, specToAdd);
	}
	
	Dump(dumpFile)
	{
		const systemDescriptor = new FileSystemDescriptor(this.disk);
		const volumeDescriptor = new VolumeDescriptor(systemDescriptor);
		const fileDescriptor = new FNodeDescriptor(volumeDescriptor, volumeDescriptor.rootFolder);
		
		const context = 
		{
			dumpFile: path.resolve(dumpFile),
			logEntries: [],
			descriptors:{},
			diskSize: this.disk.GetSize(),
			sectorSize: this.disk.SECTOR_SIZE,
			blockSize: this.disk.BLOCK_SIZE,
			writeToLog: this.writeToLog.bind(this)
		};
		
		context.descriptors[systemDescriptor.SIGNATURE] = systemDescriptor;
		context.descriptors[volumeDescriptor.SIGNATURE] = volumeDescriptor;
		context.descriptors[volumeDescriptor.bitmap.SIGNATURE] = volumeDescriptor.bitmap;
		context.descriptors[volumeDescriptor.rootFolder.SIGNATURE] = volumeDescriptor.rootFolder;
		context.descriptors[fileDescriptor.SIGNATURE] = fileDescriptor;
		
		const sectorCount = Math.floor(context.diskSize/ this.disk.SECTOR_SIZE);
		const blockCount = Math.floor(context.diskSize / this.disk.BLOCK_SIZE);
		context.logEntries.push("Disk dump of " + this.disk.diskSpec);
		context.logEntries.push("Taken  " + new Date());
		context.logEntries.push("Sector size:  0x" + this.disk.SECTOR_SIZE.toString(16) + ", Block size: 0x" + this.disk.BLOCK_SIZE.toString(16));
		context.logEntries.push("Disk size: 0x" + context.diskSize.toString(16) + " bytes, 0b" + sectorCount.toString(16) + " sectors, 0b" + blockCount.toString(16) + " blocks");
		context.logEntries.push("========================================================================");
		context.logEntries.push("");
		if (systemDescriptor.bootSectorCount > 0)
		{
			context.logEntries.push("Boot loader found in sectors 0x0000 to 0x" + systemDescriptor.bootSectorCount.toString(16).padStart(4, "0"));
			context.logEntries.push("[START OF BOOT LOADER]");
		}
		else
		{
			context.logEntries.push("No boot sector detected");
		}
		
		this.writeToLog(context);
		
		const buffer = new ByteBuffer(this.disk.SECTOR_SIZE);
		
		for (let sectorNumber = 0; sectorNumber < sectorCount; sectorNumber++)
		{
			context.sectorNumber = sectorNumber;
			context.blockNumber = Math.floor((sectorNumber * this.disk.SECTOR_SIZE) / this.disk.BLOCK_SIZE);
			
			buffer.Load(this.disk.diskSpec, sectorNumber);
			const signature = buffer.GetString(0, 16);
			buffer.Dump(context);
			if (context.descriptors[signature])
			{
				//signature matches a dump file, ask that descriptor to dump because it can parse the necessary parts
				//const bytesDumped = context.descriptors[signature].Dump(context);
				//const sectorsDumped = bytesDumped / this.disk.SECTOR_SIZE;
				//sectorNumber += sectorsDumped; //skip over the sectors already dumped
			}
			else 
			{
				
			}
			
			if (systemDescriptor.bootSectorCount > 0 && systemDescriptor.bootSectorCount === sectorNumber)
			{
				context.logEntries.push("[END OF BOOT LOADER]");	
			}
			this.writeToLog(context);			
		}			
		
		//console.log(context);	
	}
	
	writeToLog(context)
	{		
		while (context.logEntries.length > 0)
		{
			const logLine = context.logEntries.shift();
			fs.appendFileSync(context.dumpFile, logLine + "\r\n");
			//console.log("\t" + logLine);
		}
	}
	
}