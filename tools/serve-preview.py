"""Local static preview server with byte-range support for precise video seeks."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from functools import partial
import argparse,re,os
class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.byte_range=None
        path=self.translate_path(self.path)
        header=self.headers.get('Range')
        if not header or not os.path.isfile(path):return super().send_head()
        size=os.path.getsize(path);match=re.fullmatch(r'bytes=(\d*)-(\d*)',header.strip())
        if match:
            a,b=match.groups()
            if a:start=int(a);end=min(int(b),size-1) if b else size-1
            else:start=max(0,size-int(b)) if b else size;end=size-1
        else:start=size;end=-1
        if start>=size or end<start:
            self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.send_header('Content-Length','0');self.end_headers();return None
        f=open(path,'rb');f.seek(start);self.byte_range=(start,end)
        self.send_response(206);self.send_header('Content-Type',self.guess_type(path));self.send_header('Content-Length',str(end-start+1));self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.end_headers();return f
    def end_headers(self):
        self.send_header('Accept-Ranges','bytes');super().end_headers()
    def copyfile(self,source,outputfile):
        if self.byte_range is None:return super().copyfile(source,outputfile)
        remaining=self.byte_range[1]-self.byte_range[0]+1
        try:
            while remaining:
                data=source.read(min(1024*1024,remaining))
                if not data:break
                outputfile.write(data);remaining-=len(data)
        except (BrokenPipeError,ConnectionResetError):pass
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8771);parser.add_argument('--directory',default=str(Path(__file__).resolve().parent.parent));args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(RangeHandler,directory=args.directory))
    print(f'Preview at http://127.0.0.1:{args.port}/',flush=True);server.serve_forever()
