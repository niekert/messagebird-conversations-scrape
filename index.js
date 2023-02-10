import fetch from 'node-fetch';
import { appendFileSync, writeFileSync } from 'fs';

const API_KEY = process.env.MB_API_KEY;

const CONVERSASTIONS_API_URL = 'https://conversations.messagebird.com/v1'
const LIMIT = 20;

if (!API_KEY) {
  throw new Error('MB_API_KEY is missing in env variables')
}


let messageBodies = []


const pushMessageBody = (message) => {
  let text;
  if (message.type === 'text') {
    text = message.content.text;
  } else if (message.type === 'email') {
    text = message.content.email.text ?? message.content.email.html;
  } else {
    return
  }

  if (!text) {
    console.log('no text for message Id', message);
    return;
  }

  if (text.includes('Goed dat je even een berichtje')) {
    console.log('skipping standard message')
    return
  }

  const withoutNewline = text.replaceAll('\n', '');

  appendFileSync("./result.csv", `${withoutNewline} \n`);
  messageBodies.push(withoutNewline);  
}

async function getMessages(conversationId, offset = 0) {
  console.log('getting messages for conversation', conversationId, 'with pagination', offset);
  const resp = await fetch(`${CONVERSASTIONS_API_URL}/conversations/${conversationId}/messages?limit=${LIMIT}&offset=${offset}`, {
    headers: {
      Authorization: `AccessKey ${API_KEY}`
    }
  });
  const json = await resp.json();


  for (let message of json.items) {
    pushMessageBody(message);
  }


  const hasNextPage = (offset + json.count) < json.totalCount;

  if (hasNextPage) {
    await getMessages(conversationId, offset + LIMIT);
  }
}

async function getConversations(offset = 0) {
  console.log('getting conversations offset', offset);

  const resp = await fetch(`${CONVERSASTIONS_API_URL}/conversations?limit=${LIMIT}&offset=${offset}`, {
    headers: {
      Authorization: `AccessKey ${API_KEY}`
    }
  })

  const json = await resp.json();

  console.log('converastions', { totalCount: json.totalCount, offset: json.offset, limit: json.limit })


  await Promise.all(
    json.items.map(item => item.id).map(id => getMessages(id))
  );

  const hasNextPage = (offset + json.count) < json.totalCount;
  if (hasNextPage) {
    await getConversations(offset + LIMIT);
  }
}


await getConversations();


console.log('messageBodies', messageBodies.length)
const csv = messageBodies.join('\n');

try {
  writeFileSync("./result2.csv", csv);
} catch (err) {
  console.error(err);
}
