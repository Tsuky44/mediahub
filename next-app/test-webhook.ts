
// import fetch from 'node-fetch'; // Built-in fetch in Node 18+

async function main() {
  const payload = {
    Event: 'PlaybackStop',
    User: {
      Id: '5b4ad72e15124140b8e855edb3caed47', // mathis
      Name: 'mathis'
    },
    Item: {
      Id: 'test-item-123',
      Name: 'Test Movie',
      Type: 'Movie',
      ProviderIds: { Tmdb: '12345' }
    },
    PlaybackInfo: {
      PositionTicks: 6000000000 // 10 minutes (10 * 60 * 10,000,000)
    },
    Session: {
      Id: 'test-session-1',
      Client: 'TestClient',
      DeviceName: 'TestDevice',
      DeviceId: 'device-123',
      RemoteEndPoint: '127.0.0.1'
    }
  };

  console.log('Sending webhook payload...');
  const res = await fetch('http://localhost:3000/api/webhooks/emby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

main().catch(console.error);
