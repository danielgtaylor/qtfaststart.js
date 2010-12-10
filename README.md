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
