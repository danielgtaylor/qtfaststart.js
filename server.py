#!/usr/bin/env python

import web

urls = (
    '/', 'UploadTest',
    '/qtfaststart.js', 'Javascript',
)

template = open("index.html").read()
js = open("qtfaststart.js").read()

class UploadTest:
    def GET(self):
        return template

    def POST(self):
        filedata = web.webapi.data()
        print len(filedata)
        open("uploaded.mp4", "wb").write(filedata)
        
        raise web.seeother('/')

class Javascript:
    def GET(self):
        return js

if __name__ == "__main__":
   app = web.application(urls, globals()) 
   app.run()

