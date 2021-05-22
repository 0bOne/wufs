/* 
disk_dump.js
	purpose:  adds f-node and file data to first volume on disk with minimal validation
	arguments:
		diskFile: path to disk file. must exist
		dumpFile: output location
*/

console.log("Dumping disk contents to text");

const fs = require('fs');
const Disk =  require('./lib/Disk.js');
const FileSystem = require('./lib/FileSystem.js');

console.log("add file: adding file to root folder on volume 0");
const args = getArgsAsObject();
const disk = new Disk(args.diskFile);
const fileSystem = new FileSystem(disk);
fileSystem.Dump(args.dumpFile);

console.log("Disk dump complete!");


function getArgsAsObject()
{
	const args = {
	 diskFile: process.argv[2],
	 dumpFile: process.argv[3]
	};
	
	console.log("Disk file:   " + args.diskFile);
	console.log("Dump file: " + args.diskFile);

	if (fs.existsSync(args.diskFile) === false)
	{
		console.error("Unable to locate disk file: " + args.diskFile);
		process.exit(1);
	}

	if (fs.existsSync(args.dumpFile))
	{
		console.error("dump file already exists: " + args.dumpFile);
		process.exit(1);
	}

	return args;
}



