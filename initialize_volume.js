/* 
initialize_volume.js
	purpose:  creates a file system header, volume header, empty volume bitmap, empty root folder node
	arguments:
		diskFile: path to disk file. must exist
*/

const fs = require('fs');
const Disk =  require('./lib/Disk.js');
const FileSystem = require('./lib/FileSystem.js');

console.log("Initialize_volume: Initializing volume with fs header, volume header, volume bitmap, empty root folder node");

const args = getArgsAsObject();
const disk = new Disk(args.diskFile);
const fileSystem = new FileSystem(disk);
fileSystem.Reinitialize();
console.log("Initialize_volume complete!");

function getArgsAsObject()
{
	const args = {
	 diskFile: process.argv[2]
	};
	
	console.log("Disk file:   " + args.diskFile);

	if (fs.existsSync(args.diskFile) === false)
	{
		console.error("Unable to locate disk file: " + args.diskFile);
		process.exit(1);
	}

	return args;
}

