/*
    Quicktime/MP4 Fast Start Javascript Port
    ========================================
    This is a port of the qtfaststart.py script for moving the metadata of
    Quicktime MOV/MP4/M4A/M4V/F4V/etc files to the head of the file for faster
    and simpler online streaming.
    
    The client-side javascript implementation of this script allows for the
    creation of:
      
      * Client-side file manipulation before upload
      * Client-side web applications to manage local files
      * Client-side metadata parsing
      * And more!
    
    Requirements
    ------------
    Currently this code relies on HTML5 File APIs for local file system access.
    You must use a browser that supports this API.
    
    Usage
    -----
    Below is an example of how to use this code:
    
      <script type="text/javascript" src="qtfaststart.js"></script>
      <script type="text/javascript">
        QtFastStart.onChunkReady = function (file, current, total, data) {
          alert("Got chunk " + current + " of " + total + " (" + data.length + " bytes)");
        }
      </script>
      <input type="file" onChange="QtFastStart.process(this);">
    
    Authors
    -------
    Daniel G. Taylor <dan@programmer-art.org>
    
    Based on an idea by Felix Geisendörfer <felix@debuggable.com>
    
    License
    -------
    Copyright 2010 Daniel G. Taylor <dan@programmer-art.org>
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
*/

/*
    Add a method to File objects to allow easily reading a blob of binary data
    into a string and calling a method when complete.
*/
File.prototype.readBlob = function (startByte, endByte, onComplete, onError) {
    var start = startByte || 0;
    var end = endByte || this.size - 1;
    var file = this;
    var reader = new FileReader();
    
    onComplete = onComplete || function (file, start, end, data) { alert(data); };
    onError = onError || function (file, msg) { alert(msg); };
    
    reader.onloadend = function (event) {
        if (event.target.readyState == FileReader.DONE) {
            // Data has been read, invoke the complete method!
            onComplete(file, start, end, event.target.result);
        }
    };
    
    reader.onerror = function (event) {
        var reason;
        
        // Get the error code's human-readable reason
        switch (event.target.error.code) {
            case FileException.NOT_FOUND_ERR:
                reason = "File not found";
                break;
            case FileException.SECURITY_ERR:
                reason = "Security error";
                break;
            case FileException.ABORT_ERR:
                reason = "Aborted";
                break;
            case FileException.NOT_READABLE_ERR:
                reason = "Not readable";
                break;
            case FileException.ENCODING_ERR:
                reason = "Encoding error";
        }
        
        onError(file, reason);
    }
    
    var len = (end - start) + 1;
    var blob = this.slice(start, len);
    
    reader.readAsBinaryString(blob);
};

/*
    Make a string method for converting a four character string into a big
    endian 32-bit unsigned integer.
*/
String.prototype.asUInt32BE = function() {
    return (this.charCodeAt(0) << 24) + (this.charCodeAt(1) << 16) + (this.charCodeAt(2) << 8) + this.charCodeAt(3);
};

/*
    Make a number method for converting a number into an unsigned 32-bit big
    endian integer string of four characters.
*/
Number.prototype.asUInt32BEString = function() {
    return String.fromCharCode((this >> 24) & 0xff) + String.fromCharCode((this >> 16) & 0xff) + String.fromCharCode((this >> 8) & 0xff) + String.fromCharCode(this & 0xff);
};

/*
    MP4 file handling class
*/
QtFastStart = function () {
    /*
        Read a single MP4 atom's type and size.
    */
    function readAtom(file, position, onComplete) {
        file.readBlob(position, position + 8, function (file, start, end, data) {
            var atomLen = data.asUInt32BE();
            var atomType = data[4] + data[5] + data[6] + data[7];
            
            onComplete(atomLen, atomType);
        }, QtFastStart.onError);
    }
    
    /*
        Read a single MP4 atom's type and size from a string buffer. Returns
        immediately as the data is already loaded in memory.
    */
    function readAtomFromBuffer(buffer, pos) {
        return {
            "type": buffer[pos + 4] + buffer[pos + 5] + buffer[pos + 6] + buffer[pos + 7],
            "len": buffer.substr(pos, 4).asUInt32BE()
        };
    }
    
    /*
        Get an index of the top level atoms in an MP4 file. Returns an array
        of atom objects which have a type, position, and length.
    */
    function getIndex(file, onComplete) {
        var index = [];
        var pos = 0;
        
        function _callback(atomLen, atomType) {
            if (atomLen) {
                index.push({"type": atomType, "pos": pos, "len": atomLen});
                pos += atomLen;
                readAtom(file, pos, _callback);
            } else {
                onComplete(file, index);
            }
        }
        
        readAtom(file, pos, _callback);
    }
    
    /*
        Process an input file, with an optional size limit. The size limit can
        be used to limit the size of the output, effectively chopping the
        file off after a certain number of bytes. This method causes the
        onChunkReady handler to be called each time a chunk of data is
        ready to be written.
    */
    function process(file, limit) {
        var index;
        
        getIndex(file, function (file, index) {
            var mdatFound = false;
            var ftyp = null;
            var moov = null;
            var moovData = null;
            var totalChunks = 0;
            for (var x = 0; x < index.length; x++) {
                var atom = index[x];
                
                // Check for certain atoms we need
                if (atom.type == "ftyp") {
                    QtFastStart.onLog(file, "Found ftyp atom!");
                    ftyp = atom;
                } else if (atom.type == "mdat") {
                    QtFastStart.onLog(file, "Found mdat atom!");
                    mdatFound = true;
                } else if (atom.type == "moov") {
                    QtFastStart.onLog(file, "Found moov atom!");
                    if (!mdatFound) {
                        QtFastStart.onError(file, "File appears to already be setup for streaming");
                        return;
                    } else {
                        moov = atom;
                    }
                }
                
                // Calculate total number of chunks to be written
                totalChunks += Math.floor(atom.len / QtFastStart.chunkSize)
                if (atom.len % QtFastStart.chunkSize) {
                    totalChunks += 1;
                }
            }
            
            // Make sure the file is valid
            if (!ftyp) {
                QtFastStart.onError(file, "No ftyp atom found! Not a valid MP4 file?");
                return;
            }
            
            // Start writing chunks and processing the file!
            QtFastStart.onLog(file, "Starting to write chunks...");
            file.readBlob(ftyp.pos, ftyp.pos + ftyp.len, function (file, start, end, data) {
                QtFastStart.onChunkReady(file, 1, totalChunks, data);
                
                file.readBlob(moov.pos, moov.pos + moov.len, function (file, start, end, data) {
                            
                    processMoov(file, start, end, data, totalChunks);
                    copyChunks(file, index, totalChunks, Math.max(1, limit - ftyp.len - moov.len));
                });
            });
        });
        
    }
    
    /*
        Process the moov atom. Modifies the file offsets as the moov atom
        will push them further back in the file. Creates a new binary string
        which means that at the end of this method the entire moov atom will
        be in memory twice.
    */
    function processMoov(file, start, end, data, totalChunks, offset, size) {
        var pos = 0;
        var stop = size ? size : data.length - 8;
        var moovSize = data.length;
        
        offset = offset || 8;
        
        var newAtoms = data.substr(offset - 8, 8);
        
        do {
            var atom = readAtomFromBuffer(data, pos + offset);
            
            if (atom.len) {
                if (atom.type in {"trak":'', "mdia":'', "minf":'', "stbl":''}) {
                    // Process the container atoms
                    newAtoms += processMoov(file, start, end, data, totalChunks, pos + offset + 8, atom.len - 8);
                } else if (atom.type in {"stco":'', "co64":''}) {
                    // Process the packet offset atoms
                    var version = data.substr(pos + offset + 8, 4).asUInt32BE();
                    var entryCount = data.substr(pos + offset + 12, 4).asUInt32BE();
                    // Copy over size, type, version, entry count
                    newAtoms += data.substr(pos + offset - 8, 16);
                    
                    QtFastStart.onLog(file, "Patching " + entryCount + " entries");
                    
                    for (var x = 0; x < entryCount; x++) {
                        var value = data.substr(pos + offset + 12 + (x * 4), 4).asUInt32BE();
                        newAtoms += (value + moovSize).asUInt32BEString();
                    }
                } else {
                    // Just copy the atom
                    newAtoms += data.substr(pos + offset - 8, atom.len);
                }
                
                pos += atom.len;
            }
        } while (pos < stop && atom.len);
        
        if (offset == 8) {
            // Outer layer of recursive call
            QtFastStart.onChunkReady(file, 2, totalChunks, newAtoms);
        } else {
            return newAtoms;
        }
    }
    
    /*
        Copy over the remaining atoms in chunks, skipping the ftyp and moov
        atoms as they are already processed and written.
    */
    function copyChunks(file, index, totalChunks, limit) {
        var chunks = 3;
        
        for (var x = 0; x < index.length; x++) {
            var atom = index[x];
            
            // Skip ftyp and moov atoms, copy the rest
            if (!(atom.type in {"ftyp":'', "moov":''})) {
                var start = chunks;
                
                function _callback(file, start, end, data) {
                    QtFastStart.onChunkReady(file, chunks, totalChunks, data);
                    chunks += 1;
                    
                    var pos = end + 1;
                    if (pos < atom.pos + atom.len) {
                        // Copy next chunk
                        file.readBlob(pos, (atom.len - pos < QtFastStart.chunkSize) ? (pos + (atom.len % QtFastStart.chunkSize)) : (pos + QtFastStart.chunkSize), _callback);
                    }
                }
                
                file.readBlob(atom.pos, atom.pos + (atom.len > QtFastStart.chunkSize) ? QtFastStart.chunkSize : (atom.len % QtFastStart.chunkSize), _callback);
            }
        }
    }
    
    /*
        Simple logging method to either use the debug console or alert windows
        to display data to the user.
    */
    function logger(msg) {
        if (console) {
            console.log(msg);
        } else {
            alert(msg);
        }
    }
    
    return {
        "version": "1.0 beta",
        "chunkSize": 5 * 1024 * 1024,
        "getIndex": getIndex,
        "process": process,
        "onChunkReady": function (file, current, total, data) { logger("Chunk " + current + " of " + total + " ready for writing!"); },
        "onError": function (file, error) { logger(error); },
        "onLog": function (file, msg) { logger(msg); }
    };
}();

