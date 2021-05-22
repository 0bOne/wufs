/* 
expand_disk_size.js
	purpose:  updates the boot sector of the kernel binary with overall number of sectors in the loader + 1
	arguments:
		disk: path to disk. must exist
		size: size in MiB
*/

const fs = require('fs');
const Disk =  require('./lib/Disk.js');

console.log("Create an empty disk of a specified size");
const args = getArgsAsObject();

const disk = new Disk(args.diskFile);
disk.Create(args.sizeMiB);
console.log("Created an empty disk of the specified size");

function getArgsAsObject()
{
	const args = {
		diskFile: process.argv[2],
		sizeMiB: parseInt(process.argv[3])
	};
	
	console.log("Disk file:      " + args.diskFile);
	console.log("Disk size (MB): " + args.sizeMiB);

	const diskFileExists = fs.existsSync(args.diskFile);
	if (diskFileExists)
	{
		console.error("Cannot continue. Disk already exists: " + args.diskFile);
		process.exit(1);
	}
	
	if (args.sizeMiB < 5)
	{
		console.error("Minimum disk size is 5MB. " + args.sizeMB + " was specified");
		process.exit(1);
	}

	return args;
}


