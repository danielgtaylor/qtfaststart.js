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
        data = web.input()
        
        open("uploaded.mp4", "w").write(data.myfile)
        
        raise web.seeother('/')

class Javascript:
    def GET(self):
        return js

if __name__ == "__main__":
   app = web.application(urls, globals()) 
   app.run()

