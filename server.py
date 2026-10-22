#!/usr/bin/env python3
"""
Habit & Streak Tracker - Local Development Server
Developed by Lavish Tushir

Run this script directly in your VS Code terminal:
    python3 server.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # Friendly concise logging
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))

def run():
    os.chdir(DIRECTORY)
    port = PORT

    while port < PORT + 20:
        try:
            with socketserver.TCPServer(("", port), Handler) as httpd:
                url = f"http://localhost:{port}"
                print("=" * 60)
                print("🏃 Habit & Streak Tracker")
                print("   Developed by Lavish Tushir")
                print("=" * 60)
                print(f"🚀 Server is running at: {url}")
                print(f"📁 Serving directory:   {DIRECTORY}")
                print("💡 Press Ctrl+C in this terminal to stop the server.")
                print("=" * 60)

                # Open default web browser automatically
                try:
                    webbrowser.open(url)
                except Exception:
                    pass

                httpd.serve_forever()
                break
        except OSError as e:
            if e.errno == 48: # Address already in use
                port += 1
            else:
                raise e

if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped. Goodbye!")
        sys.exit(0)
