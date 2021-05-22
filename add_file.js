/* 
add_file.js
	purpose:  adds f-node and file data to first volume on disk with minimal validation
	arguments:
		diskFile: path to disk file. must exist
		addingFile: file to be added
*/

const fs = require('fs');
const Disk =  require('./lib/Disk.js');
const FileSystem = require('./lib/FileSystem.js');

console.log("add file: adding file to root folder on volume 0");
const args = getArgsAsObject();
const disk = new Disk(args.diskFile);
const fileSystem = new FileSystem(disk);
fileSystem.Load();
//console.log(fileSystem);

fileSystem.AddFile(0, "/", args.addingFile);

console.log("Add file complete!");

function getArgsAsObject()
{
	const args = {
	 diskFile: process.argv[2],
	 addingFile: process.argv[3]
	};
	
	console.log("Disk file:   " + args.diskFile);
	console.log("New file: " + args.addingFile);

	const diskFileExists =  fs.existsSync(args.diskFile);
	if (diskFileExists === false)
	{
		console.error("Unable to locate disk file: " + args.diskFile);
		process.exit(1);
	}

	const newFileExists =  fs.existsSync(args.addingFile);
	if (newFileExists === false)
	{
		console.error("Unable to locate file to add: " + args.addingFile);
		process.exit(1);
	}

	return args;

}
