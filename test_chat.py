
import asyncio
import socketio
import sys

sio = socketio.AsyncClient()

connected_event = asyncio.Event()
response_received = asyncio.Event()

@sio.event
async def connect():
    print("Connected to server")
    connected_event.set()

@sio.event
async def status(data):
    print(f"Status: {data}")

@sio.event
async def transcription(data):
    print(f"Received transcription: {data}")
    if data.get('sender') == 'Lexi':
        print("SUCCESS: Lexi responded!")
        response_received.set()

@sio.event
async def error(data):
    print(f"Error: {data}")

async def main():
    try:
        print("Connecting...")
        await sio.connect('http://localhost:8000')
        print("Waiting for connection...")
        await connected_event.wait()
        
        # Wait a moment for startup messages to settle
        await asyncio.sleep(2)
        
        print("Sending chat message...")
        await sio.emit('user_input', {'text': 'Hello Lexi, are you there?'})
        
        print("Waiting for response...")
        try:
            await asyncio.wait_for(response_received.wait(), timeout=20)
        except asyncio.TimeoutError:
            print("Timed out waiting for response")
            
        await sio.disconnect()
        
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
