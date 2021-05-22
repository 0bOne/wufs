/* 
add_loader.js
	purpose:  adds the loader to the boot sector and updates the loader size in sectors at the appropriate location
	arguments:
		in: path to input binary. must exist
		out: path to output binary. must NOT exist
*/

const fs = require('fs');
const Disk = require('./lib/Disk.js');

console.log("Add loader to first sectors on virtual disk");

const args = getArgsAsObject();
const disk = new Disk(args.diskFile);
disk.AddBootLoader(args.loaderFile);

console.log("Add loader complete!");


function getArgsAsObject()
{
	//args 1 and 2 are node and the script
	const args = {
	 diskFile: process.argv[2],
	 loaderFile: process.argv[3],
	};
	
	console.log("Disk file:     " + args.diskFile);
	console.log("Loader file:    " + args.loaderFile);
	
	if (fs.existsSync(args.diskFile) === false)
	{
		console.error("Unable to locate disk file: " + args.diskFile);
		process.exit(1);
	}

	if (fs.existsSync(args.loaderFile) === false)
	{
		console.error("Unable to locate loader file: " + args.loaderFile);
		process.exit(1);	
	}
	
	return args;
}

