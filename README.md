# wufs tools

Welcome to the Woefully Unused File System build tools

## Purpose 
* Create a RAW disk image for use in OS development on Bochs or Qemu 
* Optionally, inject a boot loader into the root sector. Will write the size of the loader in whole sectors into the first sector at position 0x1FA + 0x1FB (little endian)
* Optionally, initialize the WUFS file system with a system header and root node
* Optionally, add a file to the root folder (for example, the kernel main binary) of the WUFs file system.
* Dump the entire disk in a text + hex format for troubleshooting. 
* ...or adapt it to use your own file system - or a pre-existing one for those who like to stay in their swim lane.
* I will also include some examples on how to use QEMU tools to conver the raw image into a virtual hard disk for VMWare, VirtualBox, and HyperV.

Even if you want to roll your own file system (most OS developers are VERY independently minded after all) this could be a good place to start and derive. At the risk of repeating myself and breaking the DRY principle, please consider adding your file system to this utility!

of course, if you want to create JUST a raw disk image, you don't need this program. Youcan use anything that writes a bunch of bytes into a file in an even number of sectors.

For the chosen few who want to use the WUFS file system I will create a separate readme.
I would love to hear from anyone who wants to add existing file systems to the script.  The program is written in NodeJS so it is wonderfully transparent and cross-platform.  Time to throw out all those opaque binaries that create file systems.

Designed for Intel emulators and virtual machines.

Originally I wrote much of this in powershell. My goodness, can PowerShell get ugly fast!   I realized that nodejs was much more versatile, cross platform and better supported. And did not leave me feeling like I was looking at some arcane stone-table language from 4,000 years ago!

## Roadmap
This roadmap is in the distance, as the tools do what I need for my build right now.  However, I am wanting to be able to treat these tools as a full suite of file system interactions without having to write a file system mount driver, so I am looking at a more robust add_file, dir/ls, add_folder, delete, rename/mv, etc. as time permits.  I would also love to add support for real-world file systems from NTFS to EXTnn. Although they are not a priority, having them in a nodejs file will be a lot less opaque than binary tools that do the same. If nothing else that would be a great teaching tool on how they work, especially for those of us whose eyes bleed at the sight of C code.

## Use
Typically, it would be used in the order listed above: createa a raw disk image, inject a boot loader, initialize the file system and inject the kernel into the root folder.

The program is hardcoded for a sector size of 512 bytes, and a file system block size of 4096 bytes.  It's a script, so that's easy to change if you need different parameters.

### Creating a raw disk image

* **Script** create_disk.js
* **Argument 1** output file path. Will fail if file already exists.
* **Argument 2** desired disk size in MiB

Example: 
```
node.exe .\create_disk.js path\to\bootable.raw 5
```
In Bochs, for example, you can reference the file with something like this...
```
ata0-master: type=disk, path="C:\_dev\Rabbie\src\bin\bootable.raw", mode=flat, cylinders=2, heads=16, spt=63, model="Generic 1234", biosdetect=none, translation=lba
```
Of course, it will not boot because there is nothing ON the disk.  It is essentially a large binary file full of zeros.

### Injecting a boot loader

* **Script** add_loader.js
* **Argument 1** raw disk path. Will fail if file does not exist
* **Argument 2** loader binary file.  Must be raw binary. No ELF, PE, etc.

Will replace the first sectors of the raw disk with your boot loader binary.
Will ALSO calculate the size of the loader in whole sectors, and inject this number into the first sector at position 0x1FA + 0x1FB (little endian).
That's because the boot sector is litereally ONE SECTOR. And everything you need to continue loading the rest of your boot loader must be in that first sector.
So, remember to jump over those bytes in your loader (you have to jump over the boot sector signature at 0x1FE anyway) or change the code in lib/Disk.js to point to where you want it written.  Or comment out this line in lib/Disk.js AddBootLoader:
```
		buffer.AddNumber(this.LOADER_SIZE_LOCATION, sectorCount, 2); 
```

When writing a boot loader remember two important things:
* You have 1 sector (minus the signature at the end) 510 bytes loaded into RAM.
* Your boot loader has a LOT of work to do to get a kernel into memory, certainly more than can be done in 1 510 bytes.

I will publish my boot loader at some point soon for anyone who wants a working example of how to get to long mode.

Of course, if you are developing for another platform (say ARM) the rules are different and this won't work.  And you don't have to add a boot loader if you are creating a non-bootable disk image.

### Initializing a file system
This, of course, is specific to the WUFS file system, so you are done, unless (a)you want to experiment with a new, untested file system that doesn't exist anywhere outside the RabbieOS project (at the time of writing) or wish to roll your own (in which case, WUFS tools is a great place to add it and get it known).

(A quick plug of the file system - it is optimized for long mode because most structures are 8-bytes and aligned. Also, f-nodes do not store one address per block, but one address and one _contigous range size_.  This means that a very large file, if contiguous will still fit in a single f-node with room to spare. Only fragemented files will require more than one block for the f-node, and defragmentation will shorten that).  In fact it is so efficient I'm thinking of lowering the block size from 4096 bytes to 512, for even more simplicity. Another thing worth mentioning about WUFS. Originally it was designe dto be multi-volume but I realized that was overcomplicated for a file system designed only to be used on VMs. Just add another virtual hard drive instead!  So it is a single-volume absoletely addressed file system that tracks used/empty space with a bitmap - 1 bit per block)

If you are adding a loader, do that FIRST or it will overwrite the file system structures.

* **Script** add_loader.js
* **Argument 1** raw disk path. Will fail if file does not exist

Creates the WUFS system signature, usage bitmap, and d-node that represents the root folder. (The folder we thing of as '/', or '\' if you are old-school Windows)

### Injecting a file/the kernel
My kernel (a generous name for what is it to date) is raw, relocatable binary with an entry point at the start.  However, your kernel can be PE, ELF, or whatever it needs to be. Provided your loader recognizes it, can loads it, initializes it, and can find the entry point!

It will appear on disk as whatever original name it had (eg kernel.bin) in the root folder.   

WARNING: I have only tested adding a single kernel file at the time of writing. IDK what will happen if you add more than one file.  I intend to add this support later, but I have a finite number of hours, so I encourage pull requests for anyone who wants to beat me to it.

* **Script** add_file.js
* **Argument 1** raw disk path. Will fail if file does not exist
* **Argument 2** the file to inject. Will fail if file does not exist

The file bytes will be written to a whole number of free blocks on disk, and an F-node created containing one child descriptor: The location and length (in blocks) of the file bytes.  The root folder will be updated to include a pointer to the f-node.

Adding more than one file produces undefined behavior. Maybe it will work, but I don't recall specifically taking into account anything other than the first file in the root.

### Dumping the disk
Notepad++ threatened me with uninstallation if I kept opening giant raw disk files when troubleshooting, so I had to do something.   The dump utility produces a text output that contains both hex bytes and ascii, side-by-side like a traditional binary viewer.  So that the file is not full of a gazillion zeros, empty sectors get one line stating that the sector is empty.  This is not a fast dump tool but it does the job. For eye health while debugging, WUFs nodes have 16-bute human-readable signatures ("WUFS_SYSTEM_INFO", "WUFS_BITMAP_INFO", "WUFS_WUFS_F_NODE_INFO", "WUFS_D_NODE_INFO", etc).  

* **Script** disk_dump.js
* **Argument 1** raw disk path. Will fail if file does not exist
* **Argument 2** output (dump) text file. Will file if file alredy exists.

The dump utility is a raw dump utility, and has no awareness or requirement for a file system. It produces output like this...

```
Disk dump of bootable.raw
Taken  Sat May 22 2021 10:39:36 GMT-0400 (Eastern Daylight Time)
Sector size:  0x200, Block size: 0x1000
Disk size: 0xa00000 bytes, 0b5000 sectors, 0ba00 blocks
========================================================================

Boot loader found in sectors 0x0000 to 0x000e
[START OF BOOT LOADER]
BLOCKADDR BYTEADDR HEX												                      ASCII			
0000 0000 00000000 31 c0 8e d8 88 16 82 7d b8 00 00 8e d0 bc fe 07  1......}........
0000 0000 00000010 be d8 7c e8 94 01 be 19 7d e8 8e 01 8a 16 82 7d  ..|.....}......}
0000 0000 00000020 b4 08 bf 00 00 cd 13 0f 82 a1 00 88 16 84 7d 88  ..............}.
0000 0000 00000030 36 87 7d 88 c8 24 3f a2 88 7d 31 c0 a1 fa 7d 48  6.}..$?..}1...}H
0000 0000 00000040 50 89 c2 e8 7e 01 be 3a 7d e8 5e 01 a1 fa 7d 48  P...~..:}.^...}H
0000 0000 00000050 a3 85 7d b8 00 7e a3 7e 7d b1 02 b6 00 b5 00 8a  ..}..~.~}.......
0000 0000 00000060 16 82 7d a1 85 7d 31 db 8a 1e 88 7d 39 d8 7e 02  ..}..}1....}9.~.
...note: skip a few lines so you can see the end of the first sector...
0000 0000 000001b0 00 89 e5 ac 08 c0 74 09 b4 0e bb 00 00 cd 10 eb  ......t.........
0000 0000 000001c0 f2 89 ec c3 89 e5 52 51 b9 04 00 c1 c2 04 89 d0  ......RQ........
0000 0000 000001d0 24 0f 3c 0a 7c 02 04 07 04 30 b4 0e bb 00 00 cd  $.<.|....0......
0000 0000 000001e0 10 e2 e8 59 5a c3 00 00 00 00 00 00 00 00 00 00  ...Y............
0000 0000 000001f0 00 00 00 00 00 00 00 00 00 00 0e 00 dd dd 55 aa  ..............U.
...note: skip a few more so you can see how empty sectors appear...
...note: also the bitmap node signature and a marker to show where the boot loader ends...
000e 0001 00001de0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
000e 0001 00001df0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
[END OF BOOT LOADER]
000f 0001 00001e00 to 00002000 [ALL ZERO]
0010 0002 00002000 52 42 46 53 5f 42 49 54 4d 41 50 5f 49 4e 46 4f  RBFS_BITMAP_INFO
0010 0002 00002010 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
0010 0002 00002020 1f 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
0010 0002 00002030 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
```

## Converting to virtual disk images

For VM environments that don't support raw disk images (or when I don't want to use a raw disk image) I used
I use QEMUs excellent [qemu-img](https://qemu.readthedocs.io/en/latest/tools/qemu-img.html) tool for this.  Here are a few examples.

* **QEMU** Ironically, perhaps, I use the raw disk image for QEMU, so I can't show you the QCOW coversion command.  However, they are all very similar!
* **VirtualBox** qemu-img.exe convert -O vdi bootable.raw bootable.vdi
* **VMWare** qemu-img.exe convert -O vmdk bootable.raw bootable.vmdk
* **HyperV** qemu-img.exe convert -O vhdx bootable.raw bootable.vhdx

It simply takes the raw disk image as the input, and generates a disk image compatible with the desired virtual environment. Simple!

With these tools, I can make a change in my loader or kernel source, and have the binary running in an emulator or VM within about 10 seconds, crucial if you are trying to 'hold that thought' while to test a quick change in something as complicated and finicky as an OS.


## Acknowldgements and feedback
This is a build tool created for the RabbieOS Project (currently unpublished). Inspired by Rabbie the Scottish Terrier - who was a very independent-minded friend of mine.
```
     //
 /   =6_.
 ###// w
//  \\
```

Thanks to the awesome folks at [NodeJs](https://nodejs.org/), [Bochs](https://bochs.sourceforge.io/), and [Qemu](https://www.qemu.org/), and all the helpful hints and tips at [OSDev](https://wiki.osdev.org/Main_Page).

If anyone has any bugs, tips, enhancements, or suggestions, please let me know!

















